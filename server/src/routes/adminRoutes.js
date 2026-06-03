const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { auth, requireRole } = require("../middleware/auth");
const User = require("../models/User");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Material = require("../models/Material");
const Quiz = require("../models/Quiz");
const StudentProgress = require("../models/StudentProgress");
const ActivityLog = require("../models/ActivityLog");
const School = require("../models/School");
const ClassSection = require("../models/ClassSection");
const FeeAccount = require("../models/FeeAccount");
const Attendance = require("../models/Attendance");
const Assignment = require("../models/Assignment");
const Announcement = require("../models/Announcement");
const { DEFAULT_FIRST_PASSWORD, generateTempPassword } = require("../utils/password");
const { createBulkStudents, ensureUsernameAvailable, generateUniqueUsername } = require("../utils/accounts");
const { ensureBaseCourses, toSlug } = require("../utils/courses");
const {
  backfillClassFeeAccounts,
  calculateFeeStatus,
  ensureFeeForStudentId,
  normalizeFeeStatus: normalizeCentralFeeStatus,
  recordPayment,
  serializeFeeAccount,
  syncStudentFeeFields
} = require("../utils/feeManager");

const router = express.Router();
router.use(auth, requireRole("admin"));

const MATERIAL_TYPES = ["pdf", "book", "notes", "video"];
const LANGUAGES = ["en", "ta", "both"];
const FIXED_GRADES = Array.from({ length: 12 }, (_, index) => `Grade ${index + 1}`);
const UPLOAD_DIR = path.join(__dirname, "../../uploads/materials");
const ALLOWED_MIME_TYPES = new Map([
  ["application/pdf", "pdf"],
  ["video/mp4", "video"],
  ["video/webm", "video"],
  ["video/ogg", "video"],
  ["text/plain", "notes"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "notes"],
  ["application/msword", "notes"]
]);

function safeText(value) {
  return String(value || "").trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizeFeeStatus(totalFees, paidAmount, dueDate) {
  return calculateFeeStatus(totalFees, paidAmount, dueDate);
}

function feeStatusFromInput(value) {
  return normalizeCentralFeeStatus(value);
}

function parseStudentCsv(csvText) {
  return String(csvText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [fullName, rollNumber, parentName, parentContact, grade, className] = line.split(",").map((part) => safeText(part));
      return { fullName, rollNumber, parentName, parentContact, grade, className };
    })
    .filter((row) => row.fullName.toLowerCase() !== "student name");
}

function normalizeGrade(value) {
  const raw = safeText(value);
  const match = raw.match(/\d+/);
  if (!match) return "";
  const gradeNumber = Number(match[0]);
  if (gradeNumber < 1 || gradeNumber > 12) return "";
  return `Grade ${gradeNumber}`;
}

function performanceBand(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Average";
  return "Needs Improvement";
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function commonFilters(query, extra = {}) {
  const filter = { ...extra };
  if (query.schoolId) filter.schoolId = query.schoolId;
  if (query.classSectionId) filter.classSectionIds = query.classSectionId;
  if (query.grade) filter.grade = query.grade;
  if (query.studentStatus) filter.active = query.studentStatus === "active";
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ username: pattern }, { fullName: pattern }, { email: pattern }, { studentId: pattern }, { rollNumber: pattern }];
  }
  return filter;
}

function dateFilter(query, field = "date") {
  if (!query.dateFrom && !query.dateTo) return {};
  const filter = {};
  filter[field] = {};
  if (query.dateFrom) filter[field].$gte = new Date(query.dateFrom);
  if (query.dateTo) filter[field].$lte = new Date(query.dateTo);
  return filter;
}

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function getMaterialType(requestedType, mimeType) {
  if (!MATERIAL_TYPES.includes(requestedType)) return "";
  const detectedType = ALLOWED_MIME_TYPES.get(mimeType);
  if (!detectedType) return "";
  if (requestedType === "book" && detectedType === "pdf") return "book";
  if (requestedType === "pdf" && detectedType === "pdf") return "pdf";
  if (requestedType === "notes" && ["notes", "pdf"].includes(detectedType)) return "notes";
  if (requestedType === "video" && detectedType === "video") return "video";
  return "";
}

router.get("/filter-options", async (_req, res) => {
  const [schools, teachers, classes, courses] = await Promise.all([
    School.find({}).select("name code active").sort({ name: 1 }).lean(),
    User.find({ role: "teacher" }).select("fullName username schoolId classSectionIds subjects active").sort({ fullName: 1 }).lean(),
    ClassSection.find({}).select("name grade section schoolId subjects codingTracks active").sort({ grade: 1, section: 1 }).lean(),
    Course.find({}).select("name slug trackType difficulty active").sort({ name: 1 }).lean()
  ]);
  const subjects = [...new Set(classes.flatMap((row) => row.subjects || []).filter(Boolean))];
  res.json({ schools, grades: FIXED_GRADES, gradeNames: FIXED_GRADES, teachers, classes, courses, subjects });
});

router.get("/username", async (req, res) => {
  if (req.query.username) return res.json(await ensureUsernameAvailable(req.query.username));
  const suggested = await generateUniqueUsername(req.query.seed || req.query.name || "user");
  res.json({ available: true, username: suggested, suggested });
});

router.get("/dashboard", async (req, res) => {
  const studentFilter = commonFilters(req.query, { role: "student" });
  const teacherFilter = commonFilters(req.query, { role: "teacher" });
  delete teacherFilter.classSectionIds;
  if (req.query.teacherId) teacherFilter._id = req.query.teacherId;
  const classFilter = {};
  if (req.query.schoolId) classFilter.schoolId = req.query.schoolId;
  if (req.query.classSectionId) classFilter._id = req.query.classSectionId;
  if (req.query.grade) classFilter.grade = req.query.grade;
  if (req.query.subject) classFilter.subjects = req.query.subject;
  const feeFilter = {};
  if (req.query.schoolId) feeFilter.schoolId = req.query.schoolId;
  if (req.query.classSectionId) feeFilter.classSectionId = req.query.classSectionId;
  if (req.query.feeStatus) feeFilter.status = req.query.feeStatus;
  Object.assign(feeFilter, dateFilter(req.query, "dueDate"));
  const attendanceFilter = {};
  if (req.query.schoolId) attendanceFilter.schoolId = req.query.schoolId;
  if (req.query.classSectionId) attendanceFilter.classSectionId = req.query.classSectionId;
  if (req.query.attendanceStatus) attendanceFilter.status = req.query.attendanceStatus;
  Object.assign(attendanceFilter, dateFilter(req.query));
  const [totalSchools, totalClasses, totalTeachers, totalStudents, activeStudents, totalMaterials, feeAgg, attendanceAgg, quizAgg, codeAgg, recentActivities] = await Promise.all([
    School.countDocuments(req.query.schoolId ? { _id: req.query.schoolId, active: true } : { active: true }),
    ClassSection.countDocuments({ ...classFilter, active: true }),
    User.countDocuments({ ...teacherFilter, active: true }),
    User.countDocuments(studentFilter),
    User.countDocuments({ ...studentFilter, active: true }),
    Material.countDocuments({ active: true, ...(req.query.courseId ? { courseId: req.query.courseId } : {}), ...(req.query.materialType ? { type: req.query.materialType } : {}), ...(req.query.grade ? { grade: req.query.grade } : {}) }),
    FeeAccount.aggregate([{ $match: feeFilter }, { $group: { _id: null, total: { $sum: "$totalFees" }, paid: { $sum: "$paidAmount" }, pending: { $sum: { $subtract: ["$totalFees", "$paidAmount"] } } } }]),
    Attendance.aggregate([{ $match: attendanceFilter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    StudentProgress.aggregate([{ $unwind: { path: "$quizAttempts", preserveNullAndEmptyArrays: true } }, { $group: { _id: null, total: { $sum: "$quizAttempts.attempts" } } }]),
    StudentProgress.aggregate([{ $group: { _id: null, total: { $sum: "$codeRunCount" } } }]),
    ActivityLog.find({}).sort({ createdAt: -1 }).limit(10).populate("userId", "username role").lean()
  ]);
  const attendanceTotal = attendanceAgg.reduce((sum, row) => sum + row.count, 0);
  const presentCount = attendanceAgg.find((row) => row._id === "present")?.count || 0;

  res.json({
    totalSchools,
    totalClasses,
    totalTeachers,
    totalStudents,
    activeStudents,
    totalMaterials,
    pendingFees: feeAgg[0]?.pending || 0,
    revenueCollected: feeAgg[0]?.paid || 0,
    attendancePercentage: attendanceTotal ? Math.round((presentCount / attendanceTotal) * 100) : 0,
    totalQuizAttempts: quizAgg[0]?.total || 0,
    totalCodeRuns: codeAgg[0]?.total || 0,
    recentActivities: recentActivities.map((log) => ({
      action: log.action,
      username: log.userId?.username || "system",
      role: log.userId?.role || "",
      createdAt: log.createdAt,
      meta: log.meta
    }))
  });
});

router.get("/schools", async (req, res) => {
  const filter = {};
  if (req.query.schoolId) filter._id = req.query.schoolId;
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ name: pattern }, { code: pattern }, { city: pattern }, { principalName: pattern }];
  }
  const schools = await School.find(filter).sort({ createdAt: -1 }).lean();
  const [classes, teachers, students] = await Promise.all([
    ClassSection.aggregate([{ $group: { _id: "$schoolId", count: { $sum: 1 } } }]),
    User.aggregate([{ $match: { role: "teacher" } }, { $group: { _id: "$schoolId", count: { $sum: 1 } } }]),
    User.aggregate([{ $match: { role: "student" } }, { $group: { _id: "$schoolId", count: { $sum: 1 } } }])
  ]);
  const toMap = (rows) => new Map(rows.map((row) => [String(row._id), row.count]));
  const classMap = toMap(classes);
  const teacherMap = toMap(teachers);
  const studentMap = toMap(students);
  res.json(schools.map((school) => ({
    ...school,
    classCount: classMap.get(String(school._id)) || 0,
    teacherCount: teacherMap.get(String(school._id)) || 0,
    studentCount: studentMap.get(String(school._id)) || 0
  })));
});

router.post("/schools", async (req, res) => {
  const name = safeText(req.body.name || req.body.schoolName);
  const code = safeText(req.body.code || req.body.schoolCode || name).replace(/\s+/g, "-").toUpperCase();
  if (!name) return res.status(400).json({ message: "School name is required" });
  if (!code) return res.status(400).json({ message: "School code is required" });
  const school = await School.create({
    name,
    code,
    address: safeText(req.body.address),
    city: safeText(req.body.city),
    state: safeText(req.body.state),
    country: safeText(req.body.country || "India"),
    pincode: safeText(req.body.pincode),
    contactEmail: safeText(req.body.contactEmail || req.body.email),
    contactPhone: safeText(req.body.contactPhone || req.body.contactNumber),
    alternatePhone: safeText(req.body.alternatePhone || req.body.alternateNumber),
    principalName: safeText(req.body.principalName),
    logoUrl: safeText(req.body.logoUrl),
    schoolType: ["public", "private", "international", "charter", "training-center"].includes(req.body.schoolType) ? req.body.schoolType : "private",
    plan: ["trial", "basic", "pro", "enterprise"].includes(req.body.plan) ? req.body.plan : "trial",
    active: req.body.active !== false,
    createdBy: req.user.id
  });
  await ActivityLog.create({ userId: req.user.id, action: "school_created", meta: { schoolId: school._id, name } });
  res.status(201).json(school);
});

router.put("/schools/:id", async (req, res) => {
  const patch = {
    name: safeText(req.body.name || req.body.schoolName),
    address: safeText(req.body.address),
    city: safeText(req.body.city),
    state: safeText(req.body.state),
    country: safeText(req.body.country || "India"),
    pincode: safeText(req.body.pincode),
    contactEmail: safeText(req.body.contactEmail || req.body.email),
    contactPhone: safeText(req.body.contactPhone || req.body.contactNumber),
    alternatePhone: safeText(req.body.alternatePhone || req.body.alternateNumber),
    principalName: safeText(req.body.principalName),
    logoUrl: safeText(req.body.logoUrl),
    active: req.body.active !== false
  };
  if (req.body.code || req.body.schoolCode) patch.code = safeText(req.body.code || req.body.schoolCode).replace(/\s+/g, "-").toUpperCase();
  if (["public", "private", "international", "charter", "training-center"].includes(req.body.schoolType)) patch.schoolType = req.body.schoolType;
  if (["trial", "basic", "pro", "enterprise"].includes(req.body.plan)) patch.plan = req.body.plan;
  if (!patch.name) return res.status(400).json({ message: "School name is required" });
  const school = await School.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!school) return res.status(404).json({ message: "School not found" });
  await ActivityLog.create({ userId: req.user.id, action: "school_updated", meta: { schoolId: school._id } });
  res.json(school);
});

router.delete("/schools/:id", async (req, res) => {
  const school = await School.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!school) return res.status(404).json({ message: "School not found" });
  await ActivityLog.create({ userId: req.user.id, action: "school_deactivated", meta: { schoolId: school._id } });
  res.json({ message: "School deactivated" });
});

router.get("/classes", async (req, res) => {
  const filter = {};
  if (req.query.schoolId) filter.schoolId = req.query.schoolId;
  if (req.query.classSectionId) filter._id = req.query.classSectionId;
  if (req.query.grade) filter.grade = req.query.grade;
  if (req.query.subject) filter.subjects = req.query.subject;
  res.json(await ClassSection.find(filter).populate("schoolId", "name code").populate("teacherIds", "username fullName").populate("courseIds", "name slug").sort({ grade: 1, section: 1 }).lean());
});

router.post("/classes", async (req, res) => {
  const requestedSchoolIds = Array.isArray(req.body.schoolIds) && req.body.schoolIds.length ? req.body.schoolIds : (req.body.schoolId ? [req.body.schoolId] : []);
  const schoolIds = toArray(requestedSchoolIds);
  if (!schoolIds.length) return res.status(400).json({ message: "At least one valid school is required" });
  const primarySchool = await School.findById(schoolIds[0]);
  if (!primarySchool) return res.status(400).json({ message: "Valid school is required" });
  const grade = normalizeGrade(req.body.grade);
  if (!grade) return res.status(400).json({ message: "Grade is required and must be Grade 1 to Grade 12" });
  const section = safeText(req.body.section || "A");
  if (!section) return res.status(400).json({ message: "Class name is required" });
  const teacherIds = toArray(req.body.teacherIds);
  const classTeacherId = safeText(req.body.classTeacherId) || teacherIds[0];
  if (!classTeacherId) return res.status(400).json({ message: "Teacher is required" });
  const duplicate = await ClassSection.exists({ schoolId: primarySchool._id, grade, section });
  if (duplicate) return res.status(409).json({ message: `${grade} - ${section} already exists for this school` });
  
  const classSection = await ClassSection.create({
    schoolId: primarySchool._id,
    schoolIds,
    grade,
    section,
    name: `${grade} - ${section}`,
    teacherIds,
    classTeacherId,
    courseIds: toArray(req.body.courseIds),
    subjects: toArray(req.body.subjects),
    schedule: safeText(req.body.schedule),
    codingTracks: toArray(req.body.codingTracks),
    capacity: Number(req.body.capacity || 30),
    // Fee Structure
    feeType: req.body.feeType || "monthly",
    feeAmount: Number(req.body.feeAmount || 0),
    currency: safeText(req.body.currency || "INR"),
    feeDueDay: Number(req.body.feeDueDay || 5)
  });
  
  await User.updateMany({ _id: { $in: classSection.teacherIds }, role: "teacher" }, { $addToSet: { classSectionIds: classSection._id }, schoolId: primarySchool._id });
  const createdStudents = await createBulkStudents({
    students: req.body.students,
    schoolId: primarySchool._id,
    classSectionId: classSection._id,
    grade,
    courseIds: classSection.courseIds,
    createdBy: req.user.id
  });
  await ActivityLog.create({ userId: req.user.id, action: "class_created", meta: { classSectionId: classSection._id } });
  res.status(201).json({ classSection, students: createdStudents });
});

router.put("/classes/:id", async (req, res) => {
  const classSection = await ClassSection.findById(req.params.id);
  if (!classSection) return res.status(404).json({ message: "Class not found" });
  const schoolId = req.body.schoolId || classSection.schoolId;
  const school = await School.findById(schoolId);
  if (!school) return res.status(400).json({ message: "Valid school is required" });
  const teacherIds = toArray(req.body.teacherIds);
  const requestedGrade = normalizeGrade(req.body.grade || classSection.grade);
  if (!requestedGrade) return res.status(400).json({ message: "Grade is required and must be Grade 1 to Grade 12" });
  const requestedSection = safeText(req.body.section || classSection.section);
  if (!requestedSection) return res.status(400).json({ message: "Class name is required" });
  const classTeacherId = safeText(req.body.classTeacherId) || teacherIds[0];
  if (!classTeacherId) return res.status(400).json({ message: "Teacher is required" });
  const duplicate = await ClassSection.exists({ _id: { $ne: classSection._id }, schoolId: school._id, grade: requestedGrade, section: requestedSection });
  if (duplicate) return res.status(409).json({ message: `${requestedGrade} - ${requestedSection} already exists for this school` });
  classSection.schoolId = school._id;
  classSection.grade = requestedGrade;
  classSection.section = requestedSection;
  classSection.name = `${classSection.grade} - ${classSection.section}`;
  classSection.teacherIds = teacherIds;
  classSection.classTeacherId = classTeacherId;
  classSection.courseIds = toArray(req.body.courseIds);
  classSection.subjects = toArray(req.body.subjects);
  classSection.schedule = safeText(req.body.schedule);
  classSection.codingTracks = toArray(req.body.codingTracks);
  classSection.capacity = Number(req.body.capacity || classSection.capacity || 30);
  // Fee Structure
  if (req.body.feeType) classSection.feeType = req.body.feeType;
  if (req.body.feeAmount !== undefined) classSection.feeAmount = Number(req.body.feeAmount);
  if (req.body.currency) classSection.currency = safeText(req.body.currency);
  if (req.body.feeDueDay !== undefined) classSection.feeDueDay = Number(req.body.feeDueDay);
  classSection.active = req.body.active !== false;
  await classSection.save();
  await User.updateMany({ role: "teacher", classSectionIds: classSection._id }, { $pull: { classSectionIds: classSection._id } });
  await User.updateMany({ _id: { $in: teacherIds }, role: "teacher" }, { $addToSet: { classSectionIds: classSection._id }, schoolId: school._id });
  await backfillClassFeeAccounts(classSection._id, req.user.id);
  const createdStudents = await createBulkStudents({
    students: req.body.students,
    schoolId: school._id,
    classSectionId: classSection._id,
    grade: classSection.grade,
    courseIds: classSection.courseIds,
    createdBy: req.user.id
  });
  await ActivityLog.create({ userId: req.user.id, action: "class_updated", meta: { classSectionId: classSection._id } });
  res.json({ classSection: await classSection.populate("schoolId", "name code"), students: createdStudents });
});

router.delete("/classes/:id", async (req, res) => {
  const classSection = await ClassSection.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!classSection) return res.status(404).json({ message: "Class not found" });
  await ActivityLog.create({ userId: req.user.id, action: "class_deactivated", meta: { classSectionId: classSection._id } });
  res.json({ message: "Class deactivated" });
});

router.get("/teachers", async (req, res) => {
  const filter = commonFilters(req.query, { role: "teacher" });
  delete filter.classSectionIds;
  if (req.query.teacherId) filter._id = req.query.teacherId;
  if (req.query.subject) filter.subjects = req.query.subject;
  res.json(await User.find(filter).select("username fullName email phone employeeId subjects qualification experience profilePhotoUrl joiningDate salary permissions schoolId classSectionIds active createdAt").populate("schoolId", "name code").populate("classSectionIds", "name grade section").sort({ createdAt: -1 }).lean());
});

router.post("/teachers", async (req, res) => {
  const username = req.body.username
    ? String(req.body.username).trim().toLowerCase()
    : await generateUniqueUsername(req.body.fullName || req.body.email || req.body.employeeId || "teacher");
  const availability = await ensureUsernameAvailable(username);
  if (!availability.available) return res.status(409).json({ message: availability.message });
  const school = await School.findById(req.body.schoolId);
  if (!school) return res.status(400).json({ message: "Valid school is required" });
  const classSectionIds = toArray(req.body.classSectionIds);
  const tempPassword = safeText(req.body.password) || DEFAULT_FIRST_PASSWORD;
  const teacher = await User.create({
    username,
    password: tempPassword,
    role: "teacher",
    fullName: safeText(req.body.fullName),
    email: safeText(req.body.email),
    phone: safeText(req.body.phone),
    employeeId: safeText(req.body.employeeId),
    subjects: toArray(req.body.subjects),
    qualification: safeText(req.body.qualification),
    experience: safeText(req.body.experience),
    profilePhotoUrl: safeText(req.body.profilePhotoUrl),
    joiningDate: req.body.joiningDate || undefined,
    salary: Number(req.body.salary || 0),
    permissions: toArray(req.body.permissions).length ? toArray(req.body.permissions) : ["students:view", "students:manage", "classes:manage", "attendance", "materials", "assignments", "coding", "analytics", "messages", "fees:view"],
    schoolId: school._id,
    classSectionIds,
    active: req.body.active !== false,
    firstLogin: true
  });
  const teacherSchoolIds = Array.isArray(req.body.schoolIds) && req.body.schoolIds.length ? req.body.schoolIds : [String(school._id)];
  teacher.schoolIds = teacherSchoolIds;
  await teacher.save();
  await ClassSection.updateMany({ _id: { $in: classSectionIds }, schoolId: { $in: teacherSchoolIds } }, { $addToSet: { teacherIds: teacher._id } });
  await ActivityLog.create({ userId: req.user.id, action: "teacher_created", meta: { teacherId: teacher._id, username } });
  res.status(201).json({ id: teacher._id, username: teacher.username, tempPassword });
});

router.put("/teachers/:id", async (req, res) => {
  const teacher = await User.findOne({ _id: req.params.id, role: "teacher" });
  if (!teacher) return res.status(404).json({ message: "Teacher not found" });
  const incomingSchoolIds = toArray(req.body.schoolIds);
  const schoolIds = incomingSchoolIds.length ? incomingSchoolIds : (Array.isArray(teacher.schoolIds) && teacher.schoolIds.length ? teacher.schoolIds : teacher.schoolId ? [String(teacher.schoolId)] : []);
  if (!schoolIds.length) return res.status(400).json({ message: "At least one valid school is required" });
  const primarySchool = await School.findById(schoolIds[0]);
  if (!primarySchool) return res.status(400).json({ message: "Valid school is required" });
  teacher.fullName = safeText(req.body.fullName);
  teacher.email = safeText(req.body.email);
  teacher.phone = safeText(req.body.phone);
  teacher.employeeId = safeText(req.body.employeeId);
  teacher.subjects = toArray(req.body.subjects);
  teacher.qualification = safeText(req.body.qualification);
  teacher.experience = safeText(req.body.experience);
  teacher.profilePhotoUrl = safeText(req.body.profilePhotoUrl);
  teacher.joiningDate = req.body.joiningDate || undefined;
  teacher.salary = Number(req.body.salary || 0);
  const requestedPermissions = toArray(req.body.permissions);
  if (requestedPermissions.length) {
    teacher.permissions = requestedPermissions;
  } else if (!teacher.permissions || !teacher.permissions.length) {
    teacher.permissions = ["students:view", "students:manage", "classes:manage", "attendance", "materials", "assignments", "coding", "analytics", "messages", "fees:view"];
  }
  teacher.schoolIds = schoolIds;
  teacher.schoolId = primarySchool._id;
  teacher.classSectionIds = toArray(req.body.classSectionIds);
  teacher.active = req.body.active !== false;
  await teacher.save();
  await ClassSection.updateMany({ teacherIds: teacher._id }, { $pull: { teacherIds: teacher._id } });
  await ClassSection.updateMany({ _id: { $in: teacher.classSectionIds }, schoolId: { $in: teacher.schoolIds } }, { $addToSet: { teacherIds: teacher._id } });
  await ActivityLog.create({ userId: req.user.id, action: "teacher_assigned", meta: { teacherId: teacher._id } });
  res.json(await teacher.populate([{ path: "schoolId", select: "name code" }, { path: "classSectionIds", select: "name grade section" }]));
});

router.put("/teachers/:id/assignments", async (req, res) => {
  const teacher = await User.findOne({ _id: req.params.id, role: "teacher" });
  if (!teacher) return res.status(404).json({ message: "Teacher not found" });
  const incomingSchoolIds2 = toArray(req.body.schoolIds);
  const schoolIds2 = incomingSchoolIds2.length ? incomingSchoolIds2 : (Array.isArray(teacher.schoolIds) && teacher.schoolIds.length ? teacher.schoolIds : teacher.schoolId ? [String(teacher.schoolId)] : []);
  if (!schoolIds2.length) return res.status(400).json({ message: "At least one valid school is required" });
  const primarySchool2 = await School.findById(schoolIds2[0]);
  if (!primarySchool2) return res.status(400).json({ message: "Valid school is required" });
  teacher.schoolIds = schoolIds2;
  teacher.schoolId = primarySchool2._id;
  teacher.classSectionIds = toArray(req.body.classSectionIds);
  await teacher.save();
  await ClassSection.updateMany({ teacherIds: teacher._id }, { $pull: { teacherIds: teacher._id } });
  await ClassSection.updateMany({ _id: { $in: teacher.classSectionIds }, schoolId: { $in: teacher.schoolIds } }, { $addToSet: { teacherIds: teacher._id } });
  await ActivityLog.create({ userId: req.user.id, action: "teacher_assigned", meta: { teacherId: teacher._id } });
  res.json(await teacher.populate([{ path: "schoolId", select: "name code" }, { path: "classSectionIds", select: "name grade section" }]));
});

router.delete("/teachers/:id", async (req, res) => {
  const teacher = await User.findOneAndUpdate({ _id: req.params.id, role: "teacher" }, { active: false }, { new: true });
  if (!teacher) return res.status(404).json({ message: "Teacher not found" });
  await ClassSection.updateMany({ teacherIds: teacher._id }, { $pull: { teacherIds: teacher._id } });
  await ActivityLog.create({ userId: req.user.id, action: "teacher_deactivated", meta: { teacherId: teacher._id } });
  res.json({ message: "Teacher deactivated" });
});

router.get("/fees", async (req, res) => {
  const filter = {};
  if (req.query.schoolId) filter.schoolId = req.query.schoolId;
  if (req.query.classSectionId) filter.classSectionId = req.query.classSectionId;
  if (req.query.studentId) filter.studentId = req.query.studentId;
  if (req.query.status || req.query.feeStatus) filter.status = req.query.status || req.query.feeStatus;
  Object.assign(filter, dateFilter(req.query, "dueDate"));
  const rows = await FeeAccount.find(filter).populate("schoolId", "name code").populate("classSectionId", "name grade section").populate("studentId", "username fullName rollNumber").sort({ dueDate: 1 }).lean();
  res.json(rows.map(serializeFeeAccount));
});

router.post("/fees", async (req, res) => {
  const totalFees = Number(req.body.totalFees || 0);
  const paidAmount = Number(req.body.paidAmount || 0);
  const status = normalizeFeeStatus(totalFees, paidAmount, req.body.dueDate);
  const fee = await FeeAccount.findOneAndUpdate(
    { studentId: req.body.studentId },
    {
      schoolId: req.body.schoolId,
      classSectionId: req.body.classSectionId || undefined,
      studentId: req.body.studentId,
      feeType: req.body.feeType || "custom",
      totalFees,
      paidAmount,
      currency: safeText(req.body.currency || "INR"),
      dueDate: req.body.dueDate || undefined,
      notes: safeText(req.body.notes),
      status,
      customOverride: true,
      updatedBy: req.user.id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await syncStudentFeeFields(fee.studentId, fee);
  await ActivityLog.create({ userId: req.user.id, action: "fee_account_updated", meta: { feeAccountId: fee._id, studentId: fee.studentId } });
  res.status(201).json(serializeFeeAccount(fee));
});

router.put("/fees/:id", async (req, res) => {
  const totalFees = Number(req.body.totalFees || 0);
  const paidAmount = Number(req.body.paidAmount || 0);
  const fee = await FeeAccount.findByIdAndUpdate(
    req.params.id,
    {
      schoolId: req.body.schoolId,
      classSectionId: req.body.classSectionId || undefined,
      studentId: req.body.studentId,
      feeType: req.body.feeType || "custom",
      totalFees,
      paidAmount,
      currency: safeText(req.body.currency || "INR"),
      dueDate: req.body.dueDate || undefined,
      notes: safeText(req.body.notes),
      status: normalizeFeeStatus(totalFees, paidAmount, req.body.dueDate),
      customOverride: true,
      updatedBy: req.user.id
    },
    { new: true }
  );
  if (!fee) return res.status(404).json({ message: "Fee account not found" });
  await syncStudentFeeFields(fee.studentId, fee);
  await ActivityLog.create({ userId: req.user.id, action: "fee_account_updated", meta: { feeAccountId: fee._id } });
  res.json(serializeFeeAccount(fee));
});

router.post("/fees/:id/payments", async (req, res) => {
  try {
    const fee = await recordPayment({
      feeAccountId: req.params.id,
      amount: req.body.amount,
      method: safeText(req.body.method || "cash"),
      reference: safeText(req.body.reference),
      receiptNo: safeText(req.body.receiptNo || `R-${Date.now()}`),
      remarks: safeText(req.body.remarks),
      paymentDate: req.body.paymentDate,
      updatedBy: req.user.id
    });
    await ActivityLog.create({ userId: req.user.id, action: "fee_payment_recorded", meta: { feeAccountId: fee._id, amount: Number(req.body.amount || 0) } });
    res.json(serializeFeeAccount(fee));
  } catch (error) {
    res.status(error.message === "Fee account not found" ? 404 : 400).json({ message: error.message });
  }
});

router.delete("/fees/:id", async (req, res) => {
  const fee = await FeeAccount.findByIdAndDelete(req.params.id);
  if (!fee) return res.status(404).json({ message: "Fee account not found" });
  await ActivityLog.create({ userId: req.user.id, action: "fee_account_deleted", meta: { feeAccountId: fee._id } });
  res.json({ message: "Fee account deleted" });
});

router.get("/attendance", async (req, res) => {
  const filter = {};
  if (req.query.schoolId) filter.schoolId = req.query.schoolId;
  if (req.query.classSectionId) filter.classSectionId = req.query.classSectionId;
  if (req.query.studentId) filter.studentId = req.query.studentId;
  if (req.query.status || req.query.attendanceStatus) filter.status = req.query.status || req.query.attendanceStatus;
  Object.assign(filter, dateFilter(req.query));
  res.json(await Attendance.find(filter).populate("schoolId", "name code").populate("classSectionId", "name grade section").populate("studentId", "username fullName rollNumber").sort({ date: -1 }).limit(1000).lean());
});

router.post("/attendance", async (req, res) => {
  const rows = Array.isArray(req.body.records) ? req.body.records : [];
  const date = new Date(req.body.date || Date.now());
  const classSection = await ClassSection.findById(req.body.classSectionId);
  if (!classSection) return res.status(400).json({ message: "Valid class is required" });
  const writes = rows.map((row) => ({
    updateOne: {
      filter: { classSectionId: classSection._id, studentId: row.studentId, date },
      update: {
        $set: {
          schoolId: classSection.schoolId,
          classSectionId: classSection._id,
          studentId: row.studentId,
          date,
          status: ["present", "absent", "late", "leave", "excused"].includes(row.status) ? row.status : "present",
          remarks: safeText(row.remarks),
          markedBy: req.user.id
        }
      },
      upsert: true
    }
  }));
  if (writes.length) await Attendance.bulkWrite(writes);
  await ActivityLog.create({ userId: req.user.id, action: "attendance_marked", meta: { classSectionId: classSection._id, count: writes.length } });
  res.json({ updated: writes.length });
});

router.get("/attendance/reports", async (req, res) => {
  const match = {};
  if (req.query.schoolId) match.schoolId = req.query.schoolId;
  if (req.query.classSectionId) match.classSectionId = req.query.classSectionId;
  const rows = await Attendance.aggregate([{ $match: match }, { $group: { _id: { classSectionId: "$classSectionId", status: "$status" }, count: { $sum: 1 } } }]);
  res.json(rows);
});

router.get("/audit-logs", async (_req, res) => {
  const logs = await ActivityLog.find({}).sort({ createdAt: -1 }).limit(300).populate("userId", "username role").lean();
  res.json(logs.map((log) => ({ ...log, username: log.userId?.username || "system", role: log.userId?.role || "" })));
});

router.post("/students", async (req, res) => {
  const username = req.body.username
    ? String(req.body.username).trim().toLowerCase()
    : await generateUniqueUsername(req.body.fullName || req.body.email || req.body.studentId || "student");
  const availability = await ensureUsernameAvailable(username);
  if (!availability.available) return res.status(409).json({ message: availability.message });
  const assignedCourses = Array.isArray(req.body.assignedCourses) ? req.body.assignedCourses : [];
  if (!assignedCourses.length) {
    const classCourses = await ClassSection.find({ _id: { $in: toArray(req.body.classSectionIds) } }).select("courseIds").lean();
    assignedCourses.push(...classCourses.flatMap((row) => (row.courseIds || []).map(String)));
  }

  const tempPassword = DEFAULT_FIRST_PASSWORD;
  const validCourseCount = await Course.countDocuments({ _id: { $in: assignedCourses }, active: true });
  if (validCourseCount !== assignedCourses.length) return res.status(400).json({ message: "One or more courses are invalid" });

  const schoolId = req.body.schoolId || undefined;
  const classSectionIds = Array.isArray(req.body.classSectionIds) ? req.body.classSectionIds : [];
  if (schoolId) {
    const school = await School.findOne({ _id: schoolId, active: true });
    if (!school) return res.status(400).json({ message: "Valid active school is required" });
  }
  if (classSectionIds.length) {
    const classCount = await ClassSection.countDocuments({ _id: { $in: classSectionIds }, ...(schoolId ? { schoolId } : {}) });
    if (classCount !== classSectionIds.length) return res.status(400).json({ message: "One or more classes are invalid" });
  }

  const student = await User.create({
    username,
    password: safeText(req.body.password) || tempPassword,
    role: "student",
    firstLogin: true,
    assignedCourses,
    fullName: safeText(req.body.fullName),
    email: safeText(req.body.email),
    phone: safeText(req.body.phone),
    studentId: safeText(req.body.studentId),
    rollNumber: safeText(req.body.rollNumber),
    parentName: safeText(req.body.parentName),
    parentContact: safeText(req.body.parentContact),
    grade: safeText(req.body.grade),
    feeStructure: safeText(req.body.feeStructure),
    profilePhotoUrl: safeText(req.body.profilePhotoUrl),
    schoolId,
    classSectionIds
  });

  await ensureFeeForStudentId(student._id, req.body.customFeeAmount, req.user.id);

  await StudentProgress.create({ userId: student._id, completedLessons: [], quizAttempts: [], codeRunCount: 0 });
  res.status(201).json({ id: student._id, username: student.username, tempPassword });
});

router.post("/students/bulk-import", async (req, res) => {
  const inputRows = Array.isArray(req.body.rows) ? req.body.rows : parseStudentCsv(req.body.csvText);
  const defaultSchoolId = safeText(req.body.schoolId);
  const defaultClassSectionId = safeText(req.body.classSectionId);
  const created = [];
  const failed = [];

  for (let index = 0; index < inputRows.length; index += 1) {
    const row = inputRows[index] || {};
    try {
      const schoolId = safeText(row.schoolId || defaultSchoolId);
      if (!schoolId) throw new Error("School is required");
      const school = await School.findOne({ _id: schoolId, active: true });
      if (!school) throw new Error("Valid active school is required");

      const grade = safeText(row.grade);
      let classSectionId = safeText(row.classSectionId || defaultClassSectionId);
      if (!classSectionId && safeText(row.className)) {
        const className = safeText(row.className);
        const section = safeText(row.section || className);
        const classSection = await ClassSection.findOne({
          schoolId,
          ...(grade ? { grade } : {}),
          $or: [{ name: className }, { section }]
        });
        classSectionId = classSection?._id ? String(classSection._id) : "";
      }
      if (!classSectionId) throw new Error("Class is required");
      const classSection = await ClassSection.findOne({ _id: classSectionId, schoolId });
      if (!classSection) throw new Error("Valid class is required");

      const result = await createBulkStudents({
        students: [{ ...row, grade: grade || classSection.grade }],
        schoolId,
        classSectionId,
        grade: grade || classSection.grade,
        courseIds: classSection.courseIds,
        createdBy: req.user.id
      });
      created.push(...result);
    } catch (error) {
      failed.push({ row: index + 1, message: error.message, data: row });
    }
  }

  await ActivityLog.create({ userId: req.user.id, action: "students_bulk_imported", meta: { imported: created.length, failed: failed.length } });
  res.status(201).json({ rowsImported: created.length, rowsFailed: failed.length, created, failed });
});

router.get("/students", async (_req, res) => {
  await ensureBaseCourses();
  const students = await User.find(commonFilters(_req.query, { role: "student" }))
    .select("username fullName email phone studentId rollNumber parentName parentContact grade feeStructure profilePhotoUrl active createdAt assignedCourses schoolId classSectionIds feeAmount paidAmount pendingAmount feeStatus lastPaymentDate")
    .populate("assignedCourses", "name slug active")
    .populate("schoolId", "name code")
    .populate("classSectionIds", "name grade section")
    .lean();
  const studentIds = students.map((s) => s._id);
  const [progress, fees, attendanceAgg] = await Promise.all([
    StudentProgress.find({ userId: { $in: studentIds } }).lean(),
    FeeAccount.find({ studentId: { $in: studentIds } }).lean(),
    Attendance.aggregate([
      { $match: { studentId: { $in: studentIds } } },
      { $group: { _id: { studentId: "$studentId", status: "$status" }, count: { $sum: 1 } } }
    ])
  ]);
  const map = new Map(progress.map((p) => [String(p.userId), p]));
  const feeMap = new Map(fees.map((fee) => [String(fee.studentId), fee]));
  const attendanceMap = new Map();
  attendanceAgg.forEach((row) => {
    const id = String(row._id.studentId);
    const current = attendanceMap.get(id) || { total: 0, present: 0 };
    current.total += row.count;
    if (["present", "late"].includes(row._id.status)) current.present += row.count;
    attendanceMap.set(id, current);
  });

  res.json(students.map((s) => {
    const progressRecord = map.get(String(s._id)) || { completedLessons: [], quizAttempts: [], codeRunCount: 0 };
    const attendanceRecord = attendanceMap.get(String(s._id)) || { total: 0, present: 0 };
    const attendancePercentage = attendanceRecord.total ? Math.round((attendanceRecord.present / attendanceRecord.total) * 100) : Number(progressRecord.attendancePercentage || 0);
    const avgAssessment = progressRecord.quizAttempts?.length
      ? Math.round(progressRecord.quizAttempts.reduce((sum, item) => sum + Number(item.bestScore || 0), 0) / progressRecord.quizAttempts.length)
      : 0;
    const assignmentCompletion = progressRecord.completedLessons?.length ? Math.min(100, progressRecord.completedLessons.length * 10) : 0;
    const codingActivity = Math.min(100, Number(progressRecord.codeRunCount || 0) * 5);
    const performanceScore = Math.round((attendancePercentage * 0.3) + (avgAssessment * 0.35) + (assignmentCompletion * 0.2) + (codingActivity * 0.15));
    return {
      ...s,
      progress: progressRecord,
      attendancePercentage,
      feeAccount: feeMap.get(String(s._id)) || null,
      performanceScore,
      performanceLabel: performanceBand(performanceScore)
    };
  }));
});

router.put("/students/:id", async (req, res) => {
  const assignedCourses = Array.isArray(req.body.assignedCourses) ? req.body.assignedCourses : [];
  if (assignedCourses.length) {
    const validCourseCount = await Course.countDocuments({ _id: { $in: assignedCourses }, active: true });
    if (validCourseCount !== assignedCourses.length) return res.status(400).json({ message: "One or more courses are invalid" });
  }
  const schoolId = req.body.schoolId || undefined;
  const classSectionIds = toArray(req.body.classSectionIds);
  const patch = {
    fullName: safeText(req.body.fullName),
    email: safeText(req.body.email),
    phone: safeText(req.body.phone),
    studentId: safeText(req.body.studentId),
    rollNumber: safeText(req.body.rollNumber),
    parentName: safeText(req.body.parentName),
    parentContact: safeText(req.body.parentContact),
    grade: safeText(req.body.grade),
    feeStructure: safeText(req.body.feeStructure),
    profilePhotoUrl: safeText(req.body.profilePhotoUrl),
    schoolId,
    classSectionIds,
    active: req.body.active !== false
  };
  if (assignedCourses.length) patch.assignedCourses = assignedCourses;
  const student = await User.findOneAndUpdate({ _id: req.params.id, role: "student" }, patch, { new: true })
    .select("username fullName email active assignedCourses schoolId classSectionIds feeAmount paidAmount pendingAmount feeStatus lastPaymentDate")
    .populate("assignedCourses", "name slug active")
    .populate("schoolId", "name code")
    .populate("classSectionIds", "name grade section");
  if (!student) return res.status(404).json({ message: "Student not found" });

  await ensureFeeForStudentId(student._id, req.body.customFeeAmount, req.user.id);

  await ActivityLog.create({ userId: req.user.id, action: "student_updated", meta: { studentId: student._id } });
  res.json(student);
});

router.put("/students/:id/transfer", async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: "student" });
  if (!student) return res.status(404).json({ message: "Student not found" });
  const schoolId = safeText(req.body.schoolId || student.schoolId);
  const classSectionIds = toArray(req.body.classSectionIds);
  if (!schoolId) return res.status(400).json({ message: "School is required" });
  const school = await School.findOne({ _id: schoolId, active: true });
  if (!school) return res.status(400).json({ message: "Valid active school is required" });
  const classes = await ClassSection.find({ _id: { $in: classSectionIds }, schoolId });
  if (classes.length !== classSectionIds.length) return res.status(400).json({ message: "One or more classes are invalid" });
  student.schoolId = school._id;
  student.classSectionIds = classSectionIds;
  student.grade = safeText(req.body.grade || classes[0]?.grade || student.grade);
  await student.save();
  await ensureFeeForStudentId(student._id, req.body.customFeeAmount, req.user.id);
  await ActivityLog.create({ userId: req.user.id, action: "student_transferred", meta: { studentId: student._id, schoolId, classSectionIds } });
  res.json(await student.populate([{ path: "schoolId", select: "name code" }, { path: "classSectionIds", select: "name grade section" }]));
});

router.put("/students/:id/fees", async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: "student" });
  if (!student) return res.status(404).json({ message: "Student not found" });
  const status = feeStatusFromInput(req.body.status || req.body.feeStatus);
  if (!status) return res.status(400).json({ message: "Valid fee status is required" });
  const totalFees = Number(req.body.totalFees || 0);
  let paidAmount = Number(req.body.paidAmount || 0);
  if (status === "paid") paidAmount = totalFees;
  if (status === "pending") paidAmount = 0;
  const fee = await FeeAccount.findOneAndUpdate(
    { studentId: student._id },
    {
      schoolId: req.body.schoolId || student.schoolId,
      classSectionId: req.body.classSectionId || student.classSectionIds?.[0],
      studentId: student._id,
      totalFees,
      paidAmount,
      dueDate: req.body.dueDate || undefined,
      status: normalizeFeeStatus(totalFees, paidAmount, req.body.dueDate),
      customOverride: true,
      updatedBy: req.user.id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (req.body.amountPaid) {
    await recordPayment({
      feeAccountId: fee._id,
      amount: Number(req.body.amountPaid || 0),
      paymentDate: req.body.paymentDate,
      reference: safeText(req.body.receiptNumber),
      receiptNo: safeText(req.body.receiptNumber),
      updatedBy: req.user.id
    });
  } else {
    await syncStudentFeeFields(student._id, fee);
  }
  await ActivityLog.create({ userId: req.user.id, action: "student_fee_status_updated", meta: { studentId: student._id, status } });
  res.json(serializeFeeAccount(await FeeAccount.findById(fee._id)));
});

router.put("/students/:id/courses", async (req, res) => {
  const assignedCourses = Array.isArray(req.body.assignedCourses) ? req.body.assignedCourses : [];
  const validCourseCount = await Course.countDocuments({ _id: { $in: assignedCourses }, active: true });
  if (validCourseCount !== assignedCourses.length) return res.status(400).json({ message: "One or more courses are invalid" });

  const student = await User.findOneAndUpdate(
    { _id: req.params.id, role: "student" },
    { assignedCourses },
    { new: true }
  ).select("username active assignedCourses").populate("assignedCourses", "name slug active");

  if (!student) return res.status(404).json({ message: "Student not found" });
  res.json(student);
});

router.post("/students/:id/reset-password", async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: "student" });
  if (!student) return res.status(404).json({ message: "Student not found" });

  const tempPassword = generateTempPassword();
  student.password = tempPassword;
  student.firstLogin = true;
  await student.save();

  await ActivityLog.create({
    userId: req.user.id,
    action: "student_password_reset",
    meta: { studentId: student._id, username: student.username }
  });

  res.json({ id: student._id, username: student.username, tempPassword });
});

router.delete("/students/:id", async (req, res) => {
  const student = await User.findOneAndDelete({ _id: req.params.id, role: "student" });
  if (!student) return res.status(404).json({ message: "Student not found" });

  await Promise.all([
    StudentProgress.deleteOne({ userId: student._id }),
    ActivityLog.deleteMany({ userId: student._id }),
    ActivityLog.create({
      userId: req.user.id,
      action: "student_removed",
      meta: { studentId: student._id, username: student.username }
    })
  ]);

  res.json({ message: "Student removed" });
});

router.get("/courses", async (_req, res) => {
  await ensureBaseCourses();
  const courses = await Course.find({}).sort({ createdAt: 1 }).lean();
  res.json(courses);
});

router.get("/materials", async (req, res) => {
  try {
    const filter = {};
    if (req.query.schoolId) filter.schoolId = req.query.schoolId;
    if (req.query.classSectionId) filter.classSectionIds = req.query.classSectionId;
    if (req.query.courseId) filter.courseId = req.query.courseId;
    if (req.query.materialType || req.query.type) filter.type = req.query.materialType || req.query.type;
    if (req.query.grade) filter.grade = req.query.grade;
    if (req.query.subject) filter.subject = req.query.subject;
    const materials = await Material.find(filter)
      .populate("courseId", "name slug active")
      .populate("schoolId", "name code")
      .populate("classSectionIds", "name grade section")
      .populate("createdBy", "username")
      .sort({ createdAt: -1 })
      .lean();
    res.json(materials);
  } catch (error) {
    console.error("Error fetching admin materials:", error);
    res.status(500).json({ message: "Failed to fetch materials" });
  }
});

router.post("/materials", express.raw({ type: "*/*", limit: "200mb" }), async (req, res) => {
  return res.status(410).json({ message: "Material uploads now use /api/materials/upload with Cloudinary storage." });
/*
  const title = safeText(req.query.title);
  const description = safeText(req.query.description);
  const requestedType = safeText(req.query.type);
  const language = safeText(req.query.language || "en");
  const courseId = safeText(req.query.courseId);
  const originalName = safeText(req.query.fileName || "material");
  const mimeType = safeText(req.headers["content-type"]);
  const type = getMaterialType(requestedType, mimeType);

  if (!title) return res.status(400).json({ message: "Title is required" });
  if (!type) return res.status(400).json({ message: "File type does not match the selected material type" });
  if (!LANGUAGES.includes(language)) return res.status(400).json({ message: "Valid language is required" });
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ message: "Upload a file" });

  const course = await Course.findOne({ _id: courseId, active: true });
  if (!course) return res.status(400).json({ message: "Valid active course is required" });

  ensureUploadDir();
  const extension = path.extname(originalName).toLowerCase() || (mimeType.includes("pdf") ? ".pdf" : ".bin");
  const fileName = `${crypto.randomUUID()}${extension}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, req.body);

  const material = await Material.create({
    title,
    description,
    type,
    language,
    schoolId: safeText(req.query.schoolId) || undefined,
    classSectionIds: safeText(req.query.classSectionId) ? [safeText(req.query.classSectionId)] : [],
    subject: safeText(req.query.subject),
    grade: safeText(req.query.grade),
    fileName,
    originalName,
    filePath,
    mimeType,
    size: req.body.length,
    courseId,
    createdBy: req.user.id
  });

  await ActivityLog.create({ userId: req.user.id, action: "material_created", meta: { materialId: material._id, title } });
  res.status(201).json(await material.populate("courseId", "name slug active"));
*/
});

router.put("/materials/:id", async (req, res) => {
  const patch = {};
  if (typeof req.body.title === "string") patch.title = req.body.title.trim();
  if (typeof req.body.description === "string") patch.description = req.body.description.trim();
  if (MATERIAL_TYPES.includes(req.body.type)) patch.type = req.body.type;
  if (LANGUAGES.includes(req.body.language)) patch.language = req.body.language;
  if (typeof req.body.subject === "string") patch.subject = req.body.subject.trim();
  if (typeof req.body.grade === "string") patch.grade = req.body.grade.trim();
  if (req.body.schoolId !== undefined) patch.schoolId = req.body.schoolId || undefined;
  if (req.body.classSectionId !== undefined) patch.classSectionIds = req.body.classSectionId ? [req.body.classSectionId] : [];
  if (typeof req.body.active === "boolean") patch.active = req.body.active;
  if (req.body.courseId) {
    const course = await Course.findOne({ _id: req.body.courseId, active: true });
    if (!course) return res.status(400).json({ message: "Valid active course is required" });
    patch.courseId = req.body.courseId;
  }
  if (!patch.title && req.body.title !== undefined) return res.status(400).json({ message: "Title is required" });

  const material = await Material.findByIdAndUpdate(req.params.id, patch, { new: true }).populate("courseId", "name slug active");
  if (!material) return res.status(404).json({ message: "Material not found" });
  await ActivityLog.create({ userId: req.user.id, action: "material_updated", meta: { materialId: material._id, title: material.title } });
  res.json(material);
});

router.get("/notifications", async (_req, res) => {
  res.json(await Announcement.find({}).populate("schoolId", "name code").populate("classSectionId", "name grade section").populate("createdBy", "username fullName").sort({ createdAt: -1 }).lean());
});

router.post("/notifications", async (req, res) => {
  const title = safeText(req.body.title);
  const body = safeText(req.body.body);
  if (!title || !body) return res.status(400).json({ message: "Title and message are required" });
  const notification = await Announcement.create({
    schoolId: req.body.schoolId || undefined,
    classSectionId: req.body.classSectionId || undefined,
    audience: ["all", "teachers", "students", "parents", "class"].includes(req.body.audience) ? req.body.audience : (req.body.classSectionId ? "class" : "all"),
    title,
    body,
    createdBy: req.user.id
  });
  await ActivityLog.create({ userId: req.user.id, action: "notification_created", meta: { notificationId: notification._id, title } });
  res.status(201).json(notification);
});

router.put("/notifications/:id", async (req, res) => {
  const notification = await Announcement.findByIdAndUpdate(req.params.id, {
    schoolId: req.body.schoolId || undefined,
    classSectionId: req.body.classSectionId || undefined,
    audience: ["all", "teachers", "students", "parents", "class"].includes(req.body.audience) ? req.body.audience : "all",
    title: safeText(req.body.title),
    body: safeText(req.body.body),
    active: req.body.active !== false
  }, { new: true });
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  await ActivityLog.create({ userId: req.user.id, action: "notification_updated", meta: { notificationId: notification._id } });
  res.json(notification);
});

router.delete("/notifications/:id", async (req, res) => {
  const notification = await Announcement.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  await ActivityLog.create({ userId: req.user.id, action: "notification_deactivated", meta: { notificationId: notification._id } });
  res.json({ message: "Notification deactivated" });
});

router.delete("/materials/:id", async (req, res) => {
  const material = await Material.findById(req.params.id);
  if (!material) return res.status(404).json({ message: "Material not found" });

  if (material.filePath && fs.existsSync(material.filePath)) {
    try {
      fs.unlinkSync(material.filePath);
    } catch (error) {
      console.warn(`Failed to remove material file: ${material.filePath}`, error);
    }
  }

  await Promise.all([
    Material.deleteOne({ _id: material._id }),
    StudentProgress.updateMany({}, { $pull: { materialViews: { materialId: material._id } } })
  ]);

  await ActivityLog.create({ userId: req.user.id, action: "material_deleted", meta: { materialId: material._id, title: material.title } });
  res.json({ message: "Material deleted" });
});

router.post("/courses", async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Course name is required" });

  const slug = toSlug(req.body.slug || name);
  const description = String(req.body.description || "").trim();
  const course = await Course.create({ name, slug, description });
  res.status(201).json(course);
});

router.put("/courses/:id", async (req, res) => {
  const patch = {
    name: String(req.body.name || "").trim(),
    description: String(req.body.description || "").trim(),
    active: Boolean(req.body.active)
  };
  if (!patch.name) return res.status(400).json({ message: "Course name is required" });

  const course = await Course.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json(course);
});

router.get("/analytics", async (req, res) => {
  const lessonsCount = await Lesson.countDocuments();
  const students = await User.find(commonFilters(req.query, { role: "student" })).lean();
  const progress = await StudentProgress.find({}).lean();
  const logs = await ActivityLog.find({}).sort({ createdAt: -1 }).limit(200).populate("userId", "username").lean();

  const analytics = students.map((student) => {
    const p = progress.find((x) => String(x.userId) === String(student._id)) || { completedLessons: [], quizAttempts: [], codeRunCount: 0 };
    const avgQuiz = p.quizAttempts.length
      ? p.quizAttempts.reduce((acc, q) => acc + q.bestScore, 0) / p.quizAttempts.length
      : 0;
    const weakTopics = p.quizAttempts.filter((q) => q.bestScore < 60).map((q) => q.lessonId);

    return {
      studentId: student._id,
      username: student.username,
      progressPercentage: lessonsCount ? Math.round((p.completedLessons.length / lessonsCount) * 100) : 0,
      weakTopics,
      codeRunCount: p.codeRunCount,
      avgQuizScore: Math.round(avgQuiz)
    };
  });

  res.json({ analytics, logs: logs.map((l) => ({ username: l.userId?.username || "unknown", action: l.action, meta: l.meta, createdAt: l.createdAt })) });
});

router.get("/progress", async (req, res) => {
  const [students, lessons, quizzes, progressRecords] = await Promise.all([
    User.find(commonFilters(req.query, { role: "student" })).select("username active schoolId classSectionIds grade").sort({ username: 1 }).lean(),
    Lesson.find({}).select("title").sort({ createdAt: 1 }).lean(),
    Quiz.find({}).select("lessonId questions").lean(),
    StudentProgress.find({}).lean()
  ]);

  const lessonIds = lessons.map((lesson) => String(lesson._id));
  const lessonCount = lessonIds.length;
  const progressByUser = new Map(progressRecords.map((progress) => [String(progress.userId), progress]));
  const quizByLesson = new Map(quizzes.map((quiz) => [String(quiz.lessonId), quiz]));

  const studentReports = students.map((student) => {
    const progress = progressByUser.get(String(student._id)) || {
      completedLessons: [],
      quizAttempts: [],
      codeRunCount: 0
    };
    const completedLessons = new Set((progress.completedLessons || []).map((id) => String(id)));
    const attemptByLesson = new Map((progress.quizAttempts || []).map((attempt) => [String(attempt.lessonId), attempt]));
    const completedCount = lessonIds.filter((id) => completedLessons.has(id)).length;

    const lessonProgress = lessons.map((lesson) => {
      const lessonId = String(lesson._id);
      const attempt = attemptByLesson.get(lessonId);
      const quiz = quizByLesson.get(lessonId);

      return {
        lessonId,
        lessonTitle: lesson.title,
        completed: completedLessons.has(lessonId),
        quizAvailable: Boolean(quiz),
        questionCount: quiz?.questions?.length || 0,
        attempts: attempt?.attempts || 0,
        bestScore: attempt?.bestScore || 0,
        lastAttemptScore: attempt?.lastAttemptScore || 0
      };
    });

    const attemptedLessons = lessonProgress.filter((lesson) => lesson.attempts > 0);
    const avgQuizScore = attemptedLessons.length
      ? Math.round(attemptedLessons.reduce((sum, lesson) => sum + lesson.bestScore, 0) / attemptedLessons.length)
      : 0;

    return {
      studentId: student._id,
      username: student.username,
      active: student.active,
      completedLessons: completedCount,
      totalLessons: lessonCount,
      progressPercentage: lessonCount ? Math.round((completedCount / lessonCount) * 100) : 0,
      avgQuizScore,
      quizAttempts: attemptedLessons.reduce((sum, lesson) => sum + lesson.attempts, 0),
      codeRunCount: progress.codeRunCount || 0,
      lessonProgress
    };
  });

  const lessonReports = lessons.map((lesson) => {
    const lessonId = String(lesson._id);
    const quiz = quizByLesson.get(lessonId);
    const lessonRows = studentReports.map((student) => student.lessonProgress.find((row) => row.lessonId === lessonId));
    const attemptedRows = lessonRows.filter((row) => row && row.attempts > 0);

    return {
      lessonId,
      title: lesson.title,
      questionCount: quiz?.questions?.length || 0,
      completedStudents: lessonRows.filter((row) => row?.completed).length,
      totalStudents: students.length,
      attempts: lessonRows.reduce((sum, row) => sum + (row?.attempts || 0), 0),
      avgBestScore: attemptedRows.length
        ? Math.round(attemptedRows.reduce((sum, row) => sum + (row?.bestScore || 0), 0) / attemptedRows.length)
        : 0
    };
  });

  res.json({
    lessons: lessonReports,
    students: studentReports,
    summary: {
      totalStudents: students.length,
      totalLessons: lessonCount,
      totalCodeRuns: studentReports.reduce((sum, student) => sum + student.codeRunCount, 0),
      totalQuizAttempts: studentReports.reduce((sum, student) => sum + student.quizAttempts, 0)
    }
  });
});

router.get("/lessons", async (req, res) => {
  await ensureBaseCourses();
  const filter = req.query.courseId ? { courseId: req.query.courseId } : {};
  const lessons = await Lesson.find(filter).populate("courseId", "name slug").sort({ createdAt: 1 });
  res.json(lessons);
});

router.get("/quizzes/:lessonId", async (req, res) => {
  const quiz = await Quiz.findOne({ lessonId: req.params.lessonId });
  res.json(quiz);
});

router.post("/lessons", async (req, res) => {
  const course = await Course.findOne({ _id: req.body.courseId, active: true });
  if (!course) return res.status(400).json({ message: "Valid course is required" });

  res.status(201).json(await Lesson.create(req.body));
});

router.put("/lessons/:id", async (req, res) => {
  if (req.body.courseId) {
    const course = await Course.findOne({ _id: req.body.courseId, active: true });
    if (!course) return res.status(400).json({ message: "Valid course is required" });
  }

  res.json(await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});
router.delete("/lessons/:id", async (req, res) => {
  await Lesson.findByIdAndDelete(req.params.id);
  await Quiz.deleteOne({ lessonId: req.params.id });
  res.json({ message: "Lesson deleted" });
});

router.post("/quizzes", async (req, res) => res.status(201).json(await Quiz.create(req.body)));
router.put("/quizzes/:id", async (req, res) => res.json(await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true })));
router.delete("/quizzes/:id", async (req, res) => {
  await Quiz.findByIdAndDelete(req.params.id);
  res.json({ message: "Quiz deleted" });
});

module.exports = router;
