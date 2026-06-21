const express = require("express");
const crypto = require("crypto");
const JSZip = require("jszip");
const axios = require("axios");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { auth, loadUser } = require("../middleware/auth");
const Certificate = require("../models/Certificate");
const CertificateTemplate = require("../models/CertificateTemplate");
const User = require("../models/User");
const School = require("../models/School");
const ClassSection = require("../models/ClassSection");
const Course = require("../models/Course");
const { generateCertificateId, parseGradeNumber, normalizeSchoolCode } = require("../utils/certificateIdGenerator");
const { generateCertificatePDF, uploadCertificateToCloudinary, uploadQRToCloudinary } = require("../utils/certificateGenerator");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const verifyHits = new Map();
const batchStatus = new Map();

function userId(req) {
  return req.authUser?._id || req.user?.id;
}

function role(req) {
  return req.authUser?.role || req.user?.role;
}

function isExecutive(req) {
  return ["admin", "cto"].includes(role(req));
}

function baseUrl(req) {
  return (process.env.NEXT_PUBLIC_BASE_URL || process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
}

function publicPdfUrl(req, certificateId) {
  return `${baseUrl(req)}/api/certificates/pdf/${certificateId}`;
}

function safeFile(value) {
  return String(value || "certificate").replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "");
}

function uploadTemplateBuffer(buffer, name) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "robokidy-lms/certificate-templates",
        public_id: safeFile(name || "robokidy-master-template"),
        format: "pdf",
        overwrite: true
      },
      (error, result) => error ? reject(error) : resolve(result)
    );
    stream.end(buffer);
  });
}

function gradeLabelToNumber(value) {
  return parseGradeNumber(value);
}

function canUseCertificateRoutes(req, res, next) {
  if (["admin", "cto", "teacher", "student"].includes(role(req))) return next();
  return res.status(403).json({ message: "Certificate access is not available for this role" });
}

function rateLimitVerify(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  const row = verifyHits.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > row.resetAt) {
    row.count = 0;
    row.resetAt = now + 60000;
  }
  row.count += 1;
  verifyHits.set(ip, row);
  if (row.count > 60) return res.status(429).json({ verified: false, message: "Too many verification requests" });
  next();
}

async function loadActor(req) {
  return User.findById(userId(req)).select("username fullName role schoolId schoolIds classSectionIds").lean();
}

async function assertTeacherCanAccessClass(req, classId) {
  if (isExecutive(req)) return true;
  if (role(req) !== "teacher") return false;
  const actor = await loadActor(req);
  if ((actor?.classSectionIds || []).map(String).includes(String(classId))) return true;
  const klass = await ClassSection.findById(classId).select("teacherIds classTeacherId").lean();
  return Boolean(
    klass &&
    (
      String(klass.classTeacherId || "") === String(userId(req)) ||
      (klass.teacherIds || []).map(String).includes(String(userId(req)))
    )
  );
}

async function assertTeacherCanAccessStudent(req, student) {
  if (isExecutive(req)) return true;
  if (role(req) !== "teacher") return false;
  const teacherClasses = (req.authUser?.classSectionIds || []).map(String);
  return (student.classSectionIds || []).some((classId) => teacherClasses.includes(String(classId)));
}

async function studentPayload(studentId, fallbackClassId) {
  const student = await User.findOne({ _id: studentId, role: "student", active: { $ne: false } })
    .populate("schoolId", "name code logoUrl")
    .populate("classSectionIds", "name grade section schoolId")
    .lean();
  if (!student) throw new Error("Student not found");
  const klass = (student.classSectionIds || []).find((row) => String(row._id) === String(fallbackClassId)) || (student.classSectionIds || [])[0];
  const school = student.schoolId || await School.findById(klass?.schoolId).select("name code logoUrl").lean();
  if (!school) throw new Error("Student school not found");
  return { student, klass, school };
}

async function createCertificateRecord(req, { student, klass, school, courseName, issueDate, academicYear, batchId, runningNumber }) {
  const existing = await Certificate.findOne({ studentId: student._id, courseName, academicYear });
  if (existing) return { certificate: existing, reused: true };

  const grade = gradeLabelToNumber(klass?.grade || student.grade);
  const schoolCode = normalizeSchoolCode(school.code);
  const certificateId = await generateCertificateId(schoolCode, grade, academicYear, runningNumber);
  const duplicate = await Certificate.findOne({ certificateId });
  if (duplicate) throw new Error(`Duplicate certificate ID ${certificateId}`);
  const verificationUrl = `${baseUrl(req)}/verify/${certificateId}`;
  const actor = await loadActor(req);
  const common = {
    studentId: student._id,
    studentName: student.fullName || student.username,
    rollNumber: student.rollNumber || student.studentId || "N/A",
    schoolId: school._id,
    schoolName: school.name,
    schoolCode,
    schoolLogoUrl: school.logoUrl || "",
    grade,
    classId: klass?._id,
    className: klass?.name || [klass?.grade, klass?.section].filter(Boolean).join(" - "),
    courseName,
    academicYear,
    issueDate: new Date(issueDate),
    certificateId,
    verificationUrl,
    generatedBy: userId(req),
    generatedByName: actor?.fullName || actor?.username || "",
    generatedByRole: actor?.role || role(req),
    batchId,
    batchRunningNumber: runningNumber
  };

  let certificatePdfUrl = "";
  let qrCodeUrl = "";
  let uploadStatus = "uploaded";
  let status = "active";
  try {
    const { pdfBytes, qrDataUrl } = await generateCertificatePDF(common);
    try {
      certificatePdfUrl = await uploadCertificateToCloudinary(pdfBytes, certificateId, schoolCode, academicYear, common.studentName);
      qrCodeUrl = await uploadQRToCloudinary(qrDataUrl, certificateId, schoolCode);
    } catch (uploadError) {
      console.warn("Certificate upload failed, using dynamic PDF endpoint:", uploadError.message);
      certificatePdfUrl = publicPdfUrl(req, certificateId);
      uploadStatus = "pending_upload";
    }
  } catch (error) {
    console.warn("Certificate PDF generation failed:", error.message);
    certificatePdfUrl = publicPdfUrl(req, certificateId);
    uploadStatus = "failed";
    status = "pending_upload";
  }

  const certificate = await Certificate.create({ ...common, certificatePdfUrl, qrCodeUrl, uploadStatus, status });
  return { certificate, reused: false };
}

router.get("/verify/:certificateId", rateLimitVerify, async (req, res) => {
  const certificate = await Certificate.findOne({ certificateId: req.params.certificateId }).lean();
  if (!certificate) return res.json({ verified: false, message: "Certificate not found" });
  if (certificate.status === "revoked") return res.json({ verified: false, message: "Certificate revoked" });
  await Certificate.updateOne({ _id: certificate._id }, { $inc: { verificationCount: 1 }, $set: { lastVerifiedAt: new Date() } });
  res.json({
    verified: true,
    studentName: certificate.studentName,
    rollNumber: certificate.rollNumber,
    schoolName: certificate.schoolName,
    grade: certificate.grade,
    courseName: certificate.courseName,
    certificateId: certificate.certificateId,
    issueDate: certificate.issueDate,
    certificatePdfUrl: certificate.certificatePdfUrl || publicPdfUrl(req, certificate.certificateId),
    issuedBy: certificate.generatedByName,
    status: certificate.status
  });
});

router.get("/pdf/:certificateId", async (req, res) => {
  const certificate = await Certificate.findOne({ certificateId: req.params.certificateId }).lean();
  if (!certificate || certificate.status === "revoked") return res.status(404).json({ message: "Certificate not available" });
  const { pdfBytes } = await generateCertificatePDF(certificate);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${certificate.certificateId}.pdf"`);
  res.send(Buffer.from(pdfBytes));
});

router.use(auth, loadUser, canUseCertificateRoutes);

router.get("/meta", async (req, res) => {
  const currentRole = role(req);
  const classFilter = isExecutive(req) ? { active: { $ne: false } } : { _id: { $in: req.authUser.classSectionIds || [] }, active: { $ne: false } };
  const schoolFilter = isExecutive(req) ? { active: { $ne: false } } : { _id: { $in: [req.authUser.schoolId, ...(req.authUser.schoolIds || [])].filter(Boolean) }, active: { $ne: false } };
  const studentFilter = currentRole === "student"
    ? { _id: userId(req), role: "student" }
    : isExecutive(req)
      ? { role: "student", active: { $ne: false } }
      : { role: "student", active: { $ne: false }, classSectionIds: { $in: req.authUser.classSectionIds || [] } };
  const [schools, classes, students, courses] = await Promise.all([
    School.find(schoolFilter).select("name code logoUrl").sort({ name: 1 }).lean(),
    ClassSection.find(classFilter).select("name grade section schoolId teacherIds classTeacherId").sort({ grade: 1, section: 1 }).lean(),
    User.find(studentFilter).select("username fullName rollNumber studentId grade schoolId classSectionIds").sort({ rollNumber: 1, fullName: 1, username: 1 }).lean(),
    Course.find({ active: true }).select("name slug").sort({ name: 1 }).lean()
  ]);
  const activeTemplate = await CertificateTemplate.findOne({ active: true }).lean();
  res.json({ schools, classes, students, courses, templateUrl: process.env.CERTIFICATE_TEMPLATE_URL || activeTemplate?.fileUrl || "" });
});

router.get("/templates", async (req, res) => {
  if (!isExecutive(req)) return res.status(403).json({ message: "Only CEO and CTO can manage templates" });
  const rows = await CertificateTemplate.find({}).sort({ active: -1, createdAt: -1 }).lean();
  res.json(rows);
});

router.post("/templates", upload.single("template"), async (req, res) => {
  if (!isExecutive(req)) return res.status(403).json({ message: "Only CEO and CTO can upload templates" });
  if (!req.file) return res.status(400).json({ message: "PDF template is required" });
  if (req.file.mimetype !== "application/pdf") return res.status(400).json({ message: "Only PDF templates are supported" });
  if (!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
    return res.status(400).json({ message: "Cloudinary credentials are required for template uploads" });
  }
  const actor = await loadActor(req);
  const result = await uploadTemplateBuffer(req.file.buffer, req.body.name || req.file.originalname);
  if (req.body.active === "true") await CertificateTemplate.updateMany({}, { active: false });
  const template = await CertificateTemplate.create({
    name: req.body.name || req.file.originalname || "Certificate Template",
    version: req.body.version || "v1",
    fileUrl: result.secure_url,
    publicId: result.public_id,
    uploadedBy: userId(req),
    uploadedByName: actor?.fullName || actor?.username || "",
    active: req.body.active === "true"
  });
  if (template.active) process.env.CERTIFICATE_TEMPLATE_URL = template.fileUrl;
  res.status(201).json(template);
});

router.put("/templates/:id/activate", async (req, res) => {
  if (!isExecutive(req)) return res.status(403).json({ message: "Only CEO and CTO can activate templates" });
  const template = await CertificateTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ message: "Template not found" });
  await CertificateTemplate.updateMany({}, { active: false });
  template.active = true;
  await template.save();
  process.env.CERTIFICATE_TEMPLATE_URL = template.fileUrl;
  res.json(template);
});

router.post("/generate-single", async (req, res) => {
  if (!["admin", "cto", "teacher"].includes(role(req))) return res.status(403).json({ message: "Only CEO, CTO, and teachers can generate certificates" });
  const { studentId, courseName, issueDate = new Date(), academicYear } = req.body;
  if (!studentId || !courseName || !academicYear) return res.status(400).json({ message: "Student, course, and academic year are required" });
  const { student, klass, school } = await studentPayload(studentId);
  if (!(await assertTeacherCanAccessStudent(req, student))) return res.status(403).json({ message: "Teacher can only generate for assigned students" });
  const batchId = crypto.randomUUID();
  const { certificate, reused } = await createCertificateRecord(req, { student, klass, school, courseName, issueDate, academicYear, batchId, runningNumber: 1 });
  res.status(reused ? 200 : 201).json({ reused, certificate, certificateId: certificate.certificateId, certificatePdfUrl: certificate.certificatePdfUrl, qrCodeUrl: certificate.qrCodeUrl, verificationUrl: certificate.verificationUrl });
});

router.post("/generate-bulk", async (req, res) => {
  if (!["admin", "cto", "teacher"].includes(role(req))) return res.status(403).json({ message: "Only CEO, CTO, and teachers can generate certificates" });
  const { schoolId, grade, classId, courseName, issueDate = new Date(), academicYear, studentIds = [] } = req.body;
  if (!classId || !courseName || !academicYear) return res.status(400).json({ message: "Class, course, and academic year are required" });
  if (!(await assertTeacherCanAccessClass(req, classId))) return res.status(403).json({ message: "Teacher can only generate for assigned classes" });
  const klass = await ClassSection.findById(classId).lean();
  if (!klass) return res.status(404).json({ message: "Class not found" });
  const school = await School.findById(schoolId || klass.schoolId).lean();
  if (!school) return res.status(404).json({ message: "School not found" });
  const filter = { role: "student", active: { $ne: false }, classSectionIds: classId };
  if (studentIds.length) filter._id = { $in: studentIds };
  if (grade) filter.grade = new RegExp(String(grade).replace(/[^\d]/g, ""), "i");
  const students = await User.find(filter).select("username fullName rollNumber studentId grade schoolId classSectionIds").sort({ rollNumber: 1, fullName: 1, username: 1 }).lean();
  if (!students.length) return res.status(400).json({ message: "No students found for this class" });
  const batchId = crypto.randomUUID();
  batchStatus.set(batchId, { total: students.length, completed: 0, failed: 0, status: "in_progress", errors: [] });
  const results = [];
  for (let index = 0; index < students.length; index += 1) {
    try {
      const { certificate, reused } = await createCertificateRecord(req, { student: students[index], klass, school, courseName, issueDate, academicYear, batchId, runningNumber: index + 1 });
      results.push({ reused, certificateId: certificate.certificateId, studentName: certificate.studentName, certificatePdfUrl: certificate.certificatePdfUrl });
      batchStatus.get(batchId).completed += 1;
    } catch (error) {
      batchStatus.get(batchId).failed += 1;
      batchStatus.get(batchId).errors.push({ studentId: students[index]._id, message: error.message });
      results.push({ failed: true, studentName: students[index].fullName || students[index].username, message: error.message });
    }
  }
  batchStatus.get(batchId).status = "done";
  res.status(201).json({ batchId, total: students.length, results });
});

router.get("/batch-status/:batchId", (req, res) => {
  res.json(batchStatus.get(req.params.batchId) || { total: 0, completed: 0, failed: 0, status: "done" });
});

router.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const filter = {};
  ["schoolId", "classId", "studentId", "status", "academicYear"].forEach((key) => {
    if (req.query[key]) filter[key] = req.query[key];
  });
  if (req.query.grade) filter.grade = Number(req.query.grade);
  if (req.query.courseName) filter.courseName = new RegExp(String(req.query.courseName), "i");
  if (req.query.search) {
    const pattern = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ certificateId: pattern }, { studentName: pattern }, { rollNumber: pattern }, { courseName: pattern }];
  }
  if (role(req) === "teacher") filter.generatedBy = userId(req);
  if (role(req) === "student") filter.studentId = userId(req);
  const [rows, total] = await Promise.all([
    Certificate.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Certificate.countDocuments(filter)
  ]);
  res.json({ rows, total, page, limit, pages: Math.ceil(total / limit) });
});

router.get("/my", async (req, res) => {
  if (role(req) !== "student") return res.status(403).json({ message: "Only students can view their certificates here" });
  const rows = await Certificate.find({ studentId: userId(req) }).sort({ issueDate: -1 }).lean();
  res.json(rows);
});

router.get("/download-zip/:batchId", async (req, res) => {
  const filter = { batchId: req.params.batchId };
  if (role(req) === "teacher") filter.generatedBy = userId(req);
  const certificates = await Certificate.find(filter).sort({ batchRunningNumber: 1 }).lean();
  if (!certificates.length) return res.status(404).json({ message: "Batch certificates not found" });
  const zip = new JSZip();
  for (const certificate of certificates) {
    try {
      const source = certificate.certificatePdfUrl?.startsWith("http") ? certificate.certificatePdfUrl : publicPdfUrl(req, certificate.certificateId);
      const response = await axios.get(source, { responseType: "arraybuffer", timeout: 30000 });
      zip.file(`${safeFile(certificate.studentName)}_${certificate.certificateId}.pdf`, response.data);
    } catch (error) {
      zip.file(`${certificate.certificateId}_DOWNLOAD_FAILED.txt`, error.message);
    }
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const first = certificates[0];
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${safeFile(`${first.schoolCode}_G${first.grade}_${first.className}_${first.courseName}_Certificates`)}.zip"`);
  res.send(buffer);
});

router.put("/revoke/:certificateId", async (req, res) => {
  if (!isExecutive(req)) return res.status(403).json({ message: "Only CEO and CTO can revoke certificates" });
  const certificate = await Certificate.findOneAndUpdate(
    { certificateId: req.params.certificateId },
    { status: "revoked", revokedAt: new Date(), revokedBy: userId(req), revokeReason: req.body.reason || "" },
    { new: true }
  );
  if (!certificate) return res.status(404).json({ message: "Certificate not found" });
  res.json(certificate);
});

router.get("/analytics", async (req, res) => {
  if (!isExecutive(req)) return res.status(403).json({ message: "Only CEO and CTO can view certificate analytics" });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const [totalCertificates, certificatesThisMonth, certificatesThisYear, bySchool, byGrade, byCourse, byTeacher, mostVerified, recentCertificates] = await Promise.all([
    Certificate.countDocuments({}),
    Certificate.countDocuments({ createdAt: { $gte: monthStart } }),
    Certificate.countDocuments({ createdAt: { $gte: yearStart } }),
    Certificate.aggregate([{ $group: { _id: "$schoolName", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Certificate.aggregate([{ $group: { _id: "$grade", count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Certificate.aggregate([{ $group: { _id: "$courseName", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Certificate.aggregate([{ $group: { _id: "$generatedByName", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Certificate.find({}).sort({ verificationCount: -1 }).limit(5).select("certificateId studentName verificationCount").lean(),
    Certificate.find({}).sort({ createdAt: -1 }).limit(10).lean()
  ]);
  res.json({
    totalCertificates,
    certificatesThisMonth,
    certificatesThisYear,
    totalVerifications: mostVerified.reduce((sum, row) => sum + (row.verificationCount || 0), 0),
    bySchool: bySchool.map((row) => ({ schoolName: row._id || "-", count: row.count })),
    byGrade: byGrade.map((row) => ({ grade: row._id, count: row.count })),
    byCourse: byCourse.map((row) => ({ courseName: row._id || "-", count: row.count })),
    byTeacher: byTeacher.map((row) => ({ teacherName: row._id || "-", count: row.count })),
    mostVerified,
    recentCertificates
  });
});

module.exports = router;
