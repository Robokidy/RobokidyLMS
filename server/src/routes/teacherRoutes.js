const express = require("express");
const { isValidObjectId } = require("mongoose");
const { auth, loadUser, requireRole, requirePermission } = require("../middleware/auth");
const User = require("../models/User");
const School = require("../models/School");
const ClassSection = require("../models/ClassSection");
const Material = require("../models/Material");
const Course = require("../models/Course");
const CourseTrack = require("../models/CourseTrack");
const Attendance = require("../models/Attendance");
const Assignment = require("../models/Assignment");
const FeeAccount = require("../models/FeeAccount");
const StudentProgress = require("../models/StudentProgress");
const ActivityLog = require("../models/ActivityLog");
const Announcement = require("../models/Announcement");
const { DEFAULT_FIRST_PASSWORD, createBulkStudents, ensureUsernameAvailable, generateUniqueUsername } = require("../utils/accounts");

const router = express.Router();
router.use(auth, loadUser, requireRole("teacher"));

function teacherScope(req) {
  const source = req.authUser || req.user;
  return {
    schoolId: source.schoolId,
    classSectionIds: (source.classSectionIds || []).map((id) => String(id)).filter((id) => isValidObjectId(id)),
    permissions: source.permissions || []
  };
}

async function getTeacherContentScope(req) {
  const scope = teacherScope(req);
  const classFilter = { _id: { $in: scope.classSectionIds } };
  if (scope.schoolId && isValidObjectId(scope.schoolId)) classFilter.schoolId = scope.schoolId;

  const classes = scope.classSectionIds.length
    ? await ClassSection.find(classFilter).select("courseIds courseTrackIds").lean()
    : [];

  return {
    ...scope,
    courseIds: [...new Set(classes.flatMap((row) => (row.courseIds || []).map(String)).filter((id) => isValidObjectId(id)))],
    courseTrackIds: [...new Set(classes.flatMap((row) => (row.courseTrackIds || []).map(String)).filter((id) => isValidObjectId(id)))]
  };
}

function teacherContentFilter(scope, query = {}) {
  const or = [];
  if (scope.courseIds.length) or.push({ courseId: { $in: scope.courseIds } });
  if (scope.courseTrackIds.length) or.push({ courseTrackId: { $in: scope.courseTrackIds } });

  const filter = {};
  if (or.length === 1) Object.assign(filter, or[0]);
  if (or.length > 1) filter.$or = or;
  if (!or.length) filter._id = { $in: [] };

  if (query.courseId && scope.courseIds.includes(String(query.courseId))) filter.courseId = query.courseId;
  if (query.courseTrackId && scope.courseTrackIds.includes(String(query.courseTrackId))) filter.courseTrackId = query.courseTrackId;
  return filter;
}

function safeText(value) {
  return String(value || "").trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function scopedQuery(req, base = {}) {
  const scope = teacherScope(req);
  const filter = { ...base, schoolId: scope.schoolId, classSectionIds: { $in: scope.classSectionIds } };
  if (req.query.classSectionId && scope.classSectionIds.includes(String(req.query.classSectionId))) filter.classSectionIds = req.query.classSectionId;
  if (req.query.grade) filter.grade = req.query.grade;
  if (req.query.status) filter.active = req.query.status === "active";
  if (req.query.search) {
    const pattern = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ username: pattern }, { fullName: pattern }, { email: pattern }, { studentId: pattern }, { rollNumber: pattern }];
  }
  return filter;
}

async function canAccessClass(req, classSectionId) {
  const scope = teacherScope(req);
  return scope.classSectionIds.includes(String(classSectionId));
}

router.get("/dashboard", requirePermission("students:view", "students:manage", "attendance", "materials", "assignments", "coding", "analytics", "messages", "fees:view"), async (req, res) => {
  const scope = teacherScope(req);
  const [classes, students, assignments, attendanceAgg, fees, progress] = await Promise.all([
    ClassSection.find({ _id: { $in: scope.classSectionIds }, schoolId: scope.schoolId }).populate("courseTrackIds", "trackName trackCode category grade").lean(),
    User.find(scopedQuery(req, { role: "student" })).select("username fullName email active classSectionIds").lean(),
    Assignment.countDocuments({ schoolId: scope.schoolId, classSectionId: { $in: scope.classSectionIds }, active: true }),
    Attendance.aggregate([{ $match: { schoolId: scope.schoolId, classSectionId: { $in: scope.classSectionIds } } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    FeeAccount.aggregate([{ $match: { schoolId: scope.schoolId, classSectionId: { $in: scope.classSectionIds } } }, { $group: { _id: null, total: { $sum: "$totalFees" }, paid: { $sum: "$paidAmount" } } }]),
    StudentProgress.find({}).lean()
  ]);

  const studentIds = new Set(students.map((student) => String(student._id)));
  const scopedProgress = progress.filter((row) => studentIds.has(String(row.userId)));
  const attendanceTotal = attendanceAgg.reduce((sum, row) => sum + row.count, 0);
  const presentCount = attendanceAgg.find((row) => row._id === "present")?.count || 0;

  res.json({
    classes,
    totalClasses: classes.length,
    totalStudents: students.length,
    activeStudents: students.filter((student) => student.active).length,
    activeAssignments: assignments,
    attendancePercentage: attendanceTotal ? Math.round((presentCount / attendanceTotal) * 100) : 0,
    pendingFees: (fees[0]?.total || 0) - (fees[0]?.paid || 0),
    codeRuns: scopedProgress.reduce((sum, row) => sum + (row.codeRunCount || 0), 0)
  });
});

router.get("/classes", requirePermission("classes:manage", "students:view"), async (req, res) => {
  const scope = teacherScope(req);
  const classes = await ClassSection.find({ _id: { $in: scope.classSectionIds }, schoolId: scope.schoolId })
    .populate("courseTrackIds", "trackName trackCode category grade")
    .lean();
  const studentCounts = await User.aggregate([
    { $match: { role: "student", schoolId: scope.schoolId, classSectionIds: { $in: classes.map((klass) => klass._id) } } },
    { $unwind: "$classSectionIds" },
    { $match: { classSectionIds: { $in: classes.map((klass) => klass._id) } } },
    { $group: { _id: "$classSectionIds", count: { $sum: 1 } } }
  ]);
  const countMap = new Map(studentCounts.map((row) => [String(row._id), row.count]));
  res.json(classes.map((klass) => ({ ...klass, studentCount: countMap.get(String(klass._id)) || 0 })));
});

router.get("/filter-options", requirePermission("students:view", "students:manage", "attendance", "materials", "assignments"), async (req, res) => {
  const scope = teacherScope(req);
  const [school, classes, courseTracks] = await Promise.all([
    School.findById(scope.schoolId).select("name code active").lean(),
    ClassSection.find({ _id: { $in: scope.classSectionIds }, schoolId: scope.schoolId }).select("name grade section schoolId subjects codingTracks courseTrackIds active").populate("courseTrackIds", "trackName trackCode category grade active").lean(),
    CourseTrack.find({ active: true }).sort({ trackName: 1 }).lean()
  ]);
  const fallbackCourses = classes.flatMap((klass) => klass.courseTrackIds || []);
  const courseMap = new Map(fallbackCourses.map((course) => [String(course._id), course]));
  res.json({
    schools: school ? [school] : [],
    teachers: [],
    classes,
    courseTracks,
    courses: [...courseMap.values()],
    grades: [...new Set(classes.map((row) => row.grade).filter(Boolean))],
    subjects: [...new Set(classes.flatMap((row) => row.subjects || []).filter(Boolean))]
  });
});

router.get("/username", requirePermission("students:view", "students:manage"), async (req, res) => {
  if (req.query.username) return res.json(await ensureUsernameAvailable(req.query.username));
  const suggested = await generateUniqueUsername(req.query.seed || req.query.name || "student");
  res.json({ available: true, username: suggested, suggested });
});

router.post("/classes", requirePermission("classes:manage"), async (req, res) => {
  const scope = teacherScope(req);
  const requestedSchool = safeText(req.body.schoolId || scope.schoolId);
  if (String(requestedSchool) !== String(scope.schoolId)) return res.status(403).json({ message: "Teachers can only create classes in their assigned school" });
  const grade = safeText(req.body.grade || req.body.name || "Class");
  const section = safeText(req.body.section || "A");
  const courseIds = toArray(req.body.courseIds);
  const courseTrackIds = toArray(req.body.courseTrackIds);
  const classSection = await ClassSection.create({
    schoolId: scope.schoolId,
    grade,
    section,
    name: safeText(req.body.name || `${grade} - ${section}`),
    teacherIds: [req.user.id],
    classTeacherId: req.user.id,
    courseIds,
    courseTrackIds,
    subjects: toArray(req.body.subjects),
    schedule: safeText(req.body.schedule),
    codingTracks: toArray(req.body.codingTracks),
    capacity: Number(req.body.capacity || Math.max(30, Array.isArray(req.body.students) ? req.body.students.length : 0))
  });
  await User.updateOne({ _id: req.user.id, role: "teacher" }, { $addToSet: { classSectionIds: classSection._id } });
  req.authUser.classSectionIds = [...scope.classSectionIds, String(classSection._id)];
  const createdStudents = await createBulkStudents({
    students: req.body.students,
    schoolId: scope.schoolId,
    classSectionId: classSection._id,
    grade,
    courseIds,
    trackIds: courseTrackIds,
    createdBy: req.user.id
  });
  await ActivityLog.create({ userId: req.user.id, action: "teacher_class_created", meta: { classSectionId: classSection._id, students: createdStudents.length } });
  res.status(201).json({ classSection, students: createdStudents });
});

router.get("/students", requirePermission("students:view", "students:manage"), async (req, res) => {
  const scope = teacherScope(req);
  const students = await User.find(scopedQuery(req, { role: "student" }))
    .select("username fullName email phone studentId rollNumber parentName parentContact grade feeStructure profilePhotoUrl active assignedCourses assignedTrackIds classSectionIds schoolId")
    .populate("classSectionIds", "name grade section")
    .populate("assignedCourses", "name slug")
    .populate("assignedTrackIds", "trackName trackCode category grade")
    .lean();
  const progress = await StudentProgress.find({ userId: { $in: students.map((student) => student._id) } }).lean();
  const progressMap = new Map(progress.map((row) => [String(row.userId), row]));
  res.json(students.map((student) => ({ ...student, progress: progressMap.get(String(student._id)) || null })));
});

router.get("/classes/:classId/students", requirePermission("students:view", "students:manage", "attendance"), async (req, res) => {
  const scope = teacherScope(req);
  
  // Verify teacher has access to this class
  if (!scope.classSectionIds.includes(String(req.params.classId))) {
    return res.status(403).json({ message: "You do not have access to this class" });
  }

  const students = await User.find({ 
    role: "student",
    classSectionIds: req.params.classId,
    schoolId: scope.schoolId
  })
    .select("_id username fullName email studentId rollNumber profilePhotoUrl active")
    .lean();
  
  res.json(students);
});

router.post("/students", requirePermission("students:manage"), async (req, res) => {
  const scope = teacherScope(req);
  const classSectionIds = toArray(req.body.classSectionIds);
  if (!classSectionIds.length) return res.status(400).json({ message: "Assign at least one class" });
  if (!classSectionIds.every((id) => scope.classSectionIds.includes(String(id)))) {
    return res.status(403).json({ message: "Students can only be assigned to your classes" });
  }
  const assignedCourses = toArray(req.body.assignedCourses);
  const assignedTrackIds = toArray(req.body.assignedTrackIds);
  const classes = await ClassSection.find({ _id: { $in: classSectionIds }, schoolId: scope.schoolId }).select("courseIds courseTrackIds grade").lean();
  if (classes.length !== classSectionIds.length) return res.status(403).json({ message: "Invalid class assignment" });
  const allowedCourseIds = new Set(classes.flatMap((row) => ((row.courseIds || []).map(String))));
  const allowedTrackIds = new Set(classes.flatMap((row) => ((row.courseTrackIds || row.courseIds || []).map(String))));
  if (!assignedCourses.length) assignedCourses.push(...allowedCourseIds);
  if (!assignedTrackIds.length) assignedTrackIds.push(...allowedTrackIds);
  if (!assignedCourses.every((id) => allowedCourseIds.has(String(id)))) return res.status(403).json({ message: "Course access must match assigned classes" });
  if (!assignedTrackIds.every((id) => allowedTrackIds.has(String(id)))) return res.status(403).json({ message: "Track access must match assigned classes" });

  const username = req.body.username
    ? String(req.body.username).trim().toLowerCase()
    : await generateUniqueUsername(req.body.fullName || req.body.email || req.body.studentId || "student");
  const availability = await ensureUsernameAvailable(username);
  if (!availability.available) return res.status(409).json({ message: availability.message });
  const tempPassword = safeText(req.body.password) || DEFAULT_FIRST_PASSWORD;
  const student = await User.create({
    username,
    password: tempPassword,
    role: "student",
    firstLogin: true,
    assignedCourses,
    assignedTrackIds,
    fullName: safeText(req.body.fullName),
    email: safeText(req.body.email),
    phone: safeText(req.body.phone),
    studentId: safeText(req.body.studentId),
    rollNumber: safeText(req.body.rollNumber),
    parentName: safeText(req.body.parentName),
    parentContact: safeText(req.body.parentContact),
    grade: safeText(req.body.grade || classes[0]?.grade),
    feeStructure: safeText(req.body.feeStructure),
    profilePhotoUrl: safeText(req.body.profilePhotoUrl),
    schoolId: scope.schoolId,
    classSectionIds,
    active: req.body.active !== false
  });
  await Promise.all([
    StudentProgress.create({ userId: student._id, completedLessons: [], quizAttempts: [], codeRunCount: 0 }),
    ActivityLog.create({ userId: req.user.id, action: "teacher_student_created", meta: { studentId: student._id, username } })
  ]);
  res.status(201).json({ id: student._id, username: student.username, tempPassword });
});

router.put("/students/:id", requirePermission("students:manage"), async (req, res) => {
  const scope = teacherScope(req);
  const student = await User.findOne({ _id: req.params.id, role: "student", schoolId: scope.schoolId, classSectionIds: { $in: scope.classSectionIds } });
  if (!student) return res.status(404).json({ message: "Student not found in your assigned classes" });
  const classSectionIds = toArray(req.body.classSectionIds);
  if (classSectionIds.length && !classSectionIds.every((id) => scope.classSectionIds.includes(String(id)))) return res.status(403).json({ message: "Invalid class assignment" });
  const assignedCourses = toArray(req.body.assignedCourses);
  const assignedTrackIds = toArray(req.body.assignedTrackIds);
  if (classSectionIds.length) {
    const classes = await ClassSection.find({ _id: { $in: classSectionIds }, schoolId: scope.schoolId }).select("courseIds courseTrackIds").lean();
    const allowedCourseIds = new Set(classes.flatMap((row) => (row.courseIds || []).map(String)));
    const allowedTrackIds = new Set(classes.flatMap((row) => ((row.courseTrackIds || row.courseIds || []).map(String))));
    if (assignedCourses.length && !assignedCourses.every((id) => allowedCourseIds.has(String(id)))) return res.status(403).json({ message: "Course access must match assigned classes" });
    if (assignedTrackIds.length && !assignedTrackIds.every((id) => allowedTrackIds.has(String(id)))) return res.status(403).json({ message: "Track access must match assigned classes" });
  }
  student.fullName = safeText(req.body.fullName);
  student.email = safeText(req.body.email);
  student.phone = safeText(req.body.phone);
  student.studentId = safeText(req.body.studentId);
  student.rollNumber = safeText(req.body.rollNumber);
  student.parentName = safeText(req.body.parentName);
  student.parentContact = safeText(req.body.parentContact);
  student.grade = safeText(req.body.grade);
  student.feeStructure = safeText(req.body.feeStructure);
  student.profilePhotoUrl = safeText(req.body.profilePhotoUrl);
  student.classSectionIds = classSectionIds.length ? classSectionIds : student.classSectionIds;
  student.assignedCourses = assignedCourses.length ? assignedCourses : student.assignedCourses;
  student.assignedTrackIds = assignedTrackIds.length ? assignedTrackIds : student.assignedTrackIds;
  student.active = req.body.active !== false;
  await student.save();
  await ActivityLog.create({ userId: req.user.id, action: "teacher_student_updated", meta: { studentId: student._id } });
  res.json(await student.populate([{ path: "classSectionIds", select: "name grade section" }, { path: "assignedCourses", select: "name slug" }, { path: "assignedTrackIds", select: "trackName trackCode category grade" }]));
});

router.delete("/students/:id", requirePermission("students:manage"), async (req, res) => {
  const scope = teacherScope(req);
  const student = await User.findOneAndUpdate({ _id: req.params.id, role: "student", schoolId: scope.schoolId, classSectionIds: { $in: scope.classSectionIds } }, { active: false }, { new: true });
  if (!student) return res.status(404).json({ message: "Student not found in your assigned classes" });
  await ActivityLog.create({ userId: req.user.id, action: "teacher_student_deactivated", meta: { studentId: student._id } });
  res.json({ message: "Student deactivated" });
});

router.post("/attendance", requirePermission("attendance"), async (req, res) => {
  if (!(await canAccessClass(req, req.body.classSectionId))) return res.status(403).json({ message: "Class is not assigned to you" });
  const rows = Array.isArray(req.body.records) ? req.body.records : [];
  const date = new Date(req.body.date || Date.now());
  const writes = rows.map((row) => ({
    updateOne: {
      filter: { classSectionId: req.body.classSectionId, studentId: row.studentId, date },
      update: {
        $set: {
          schoolId: req.authUser.schoolId,
          classSectionId: req.body.classSectionId,
          studentId: row.studentId,
          date,
          status: row.status,
          remarks: row.remarks || "",
          markedBy: req.user.id
        }
      },
      upsert: true
    }
  }));
  if (writes.length) await Attendance.bulkWrite(writes);
  await ActivityLog.create({ userId: req.user.id, action: "attendance_marked", meta: { classSectionId: req.body.classSectionId, count: writes.length } });
  res.json({ updated: writes.length });
});

router.get("/attendance", requirePermission("attendance"), async (req, res) => {
  const scope = teacherScope(req);
  const filter = { schoolId: scope.schoolId, classSectionId: { $in: scope.classSectionIds } };
  if (req.query.classSectionId && scope.classSectionIds.includes(String(req.query.classSectionId))) filter.classSectionId = req.query.classSectionId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.dateFrom || req.query.dateTo) filter.date = {};
  if (req.query.dateFrom) filter.date.$gte = new Date(req.query.dateFrom);
  if (req.query.dateTo) filter.date.$lte = new Date(req.query.dateTo);
  res.json(await Attendance.find(filter).populate("studentId", "username fullName").populate("classSectionId", "name grade section").sort({ date: -1 }).limit(500).lean());
});

router.get("/assignments", requirePermission("assignments"), async (req, res) => {
  const scope = teacherScope(req);
  const filter = { schoolId: scope.schoolId, classSectionId: { $in: scope.classSectionIds } };
  if (req.query.classSectionId && scope.classSectionIds.includes(String(req.query.classSectionId))) filter.classSectionId = req.query.classSectionId;
  if (req.query.courseId) filter.courseId = req.query.courseId;
  res.json(await Assignment.find(filter).populate("classSectionId", "name grade section").populate("courseId", "name slug").sort({ createdAt: -1 }).lean());
});

router.post("/assignments", requirePermission("assignments"), async (req, res) => {
  if (!(await canAccessClass(req, req.body.classSectionId))) return res.status(403).json({ message: "Class is not assigned to you" });
  const assignment = await Assignment.create({
    schoolId: req.authUser.schoolId,
    classSectionId: req.body.classSectionId,
    courseId: req.body.courseId || undefined,
    title: String(req.body.title || "").trim(),
    description: String(req.body.description || "").trim(),
    dueDate: req.body.dueDate,
    maxMarks: Number(req.body.maxMarks || 100),
    createdBy: req.user.id
  });
  await ActivityLog.create({ userId: req.user.id, action: "assignment_created", meta: { assignmentId: assignment._id } });
  res.status(201).json(assignment);
});

router.put("/assignments/:id/submissions/:submissionId", requirePermission("assignments"), async (req, res) => {
  const assignment = await Assignment.findOne({ _id: req.params.id, schoolId: req.authUser.schoolId });
  if (!assignment || !(await canAccessClass(req, assignment.classSectionId))) return res.status(404).json({ message: "Assignment not found" });
  const submission = assignment.submissions.id(req.params.submissionId);
  if (!submission) return res.status(404).json({ message: "Submission not found" });
  submission.marks = Number(req.body.marks || 0);
  submission.remarks = String(req.body.remarks || "");
  submission.status = "graded";
  await assignment.save();
  await ActivityLog.create({ userId: req.user.id, action: "assignment_graded", meta: { assignmentId: assignment._id, submissionId: submission._id } });
  res.json(assignment);
});

router.get("/fees", requirePermission("fees:view", "students:manage"), async (req, res) => {
  const scope = teacherScope(req);
  const filter = { schoolId: scope.schoolId, classSectionId: { $in: scope.classSectionIds } };
  if (req.query.classSectionId && scope.classSectionIds.includes(String(req.query.classSectionId))) filter.classSectionId = req.query.classSectionId;
  if (req.query.status) filter.status = req.query.status;
  res.json(await FeeAccount.find(filter).populate("studentId", "username fullName").populate("classSectionId", "name grade section").sort({ dueDate: 1 }).lean());
});

router.get("/materials", requirePermission("materials"), async (req, res) => {
  try {
    const scope = await getTeacherContentScope(req);
    const filter = teacherContentFilter(scope, req.query);
    if (req.query.type) filter.type = req.query.type;
    if (req.query.grade) filter.grade = req.query.grade;
    if (req.query.subject) filter.subject = req.query.subject;
    res.json(await Material.find(filter).populate("courseId", "name slug").populate("courseTrackId", "trackName trackCode").sort({ createdAt: -1 }).lean());
  } catch (error) {
    console.error("Error fetching teacher materials:", error);
    res.status(500).json({ message: "Failed to fetch materials" });
  }
});

router.get("/courses", requirePermission("students:view", "materials", "assignments", "coding"), async (req, res) => {
  try {
    const scope = await getTeacherContentScope(req);
    res.json(await Course.find({ _id: { $in: scope.courseIds }, active: true }).lean());
  } catch (error) {
    console.error("Error fetching teacher courses:", error);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

router.post("/announcements", requirePermission("messages"), async (req, res) => {
  if (req.body.classSectionId && !(await canAccessClass(req, req.body.classSectionId))) return res.status(403).json({ message: "Class is not assigned to you" });
  const announcement = await Announcement.create({
    schoolId: req.authUser.schoolId,
    classSectionId: req.body.classSectionId || undefined,
    audience: req.body.classSectionId ? "class" : "students",
    title: String(req.body.title || "").trim(),
    body: String(req.body.body || "").trim(),
    createdBy: req.user.id
  });
  await ActivityLog.create({ userId: req.user.id, action: "announcement_created", meta: { announcementId: announcement._id } });
  res.status(201).json(announcement);
});

// Teacher Materials APIs - Upload, Update, Delete
router.post("/materials", requirePermission("materials"), async (req, res) => {
  try {
    const scope = teacherScope(req);
    const classes = await ClassSection.find({ _id: { $in: scope.classSectionIds } }).select("courseIds").lean();
    const courseIds = [...new Set(classes.flatMap((row) => (row.courseIds || []).map(String)))];
    
    const courseId = req.query.courseId || req.body.courseId;
    if (!courseIds.includes(String(courseId))) {
      return res.status(403).json({ message: "You cannot assign materials to this course" });
    }

    const fileName = req.query.fileName || "material";
    const fileBuffer = req.body; // Body is the file buffer from fetch
    const timestamp = Date.now();
    const filePath = `/uploads/materials/teacher_${timestamp}_${fileName}`;

    const material = await Material.create({
      title: req.query.title || "Untitled",
      description: req.query.description || "",
      courseId: courseId,
      type: req.query.type || "pdf",
      language: req.query.language || "en",
      active: true,
      fileName: `teacher_${timestamp}_${fileName}`,
      originalName: fileName,
      filePath: filePath,
      mimeType: req.headers["content-type"] || "application/octet-stream",
      size: fileBuffer.length,
      schoolId: scope.schoolId,
      createdBy: req.user.id
    });

    await ActivityLog.create({ userId: req.user.id, action: "material_uploaded", meta: { materialId: material._id } });
    res.status(201).json(material);
  } catch (error) {
    console.error("Material upload error:", error);
    res.status(500).json({ message: error.message || "Upload failed" });
  }
});

router.put("/materials/:id", requirePermission("materials"), async (req, res) => {
  try {
    const scope = teacherScope(req);
    const material = await Material.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    const classes = await ClassSection.find({ _id: { $in: scope.classSectionIds } }).select("courseIds").lean();
    const courseIds = [...new Set(classes.flatMap((row) => (row.courseIds || []).map(String)))];
    
    if (!courseIds.includes(String(material.courseId))) {
      return res.status(403).json({ message: "You cannot modify this material" });
    }

    // Update allowed fields
    if (req.body.title) material.title = req.body.title;
    if (req.body.description !== undefined) material.description = req.body.description;
    if (req.body.language) material.language = req.body.language;
    if (req.body.viewer) material.viewer = req.body.viewer;
    if (req.body.active !== undefined) material.active = req.body.active;

    await material.save();
    await ActivityLog.create({ userId: req.user.id, action: "material_updated", meta: { materialId: material._id } });
    res.json(material);
  } catch (error) {
    console.error("Material update error:", error);
    res.status(500).json({ message: error.message || "Update failed" });
  }
});

router.delete("/materials/:id", requirePermission("materials"), async (req, res) => {
  try {
    const scope = teacherScope(req);
    const material = await Material.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    const classes = await ClassSection.find({ _id: { $in: scope.classSectionIds } }).select("courseIds").lean();
    const courseIds = [...new Set(classes.flatMap((row) => (row.courseIds || []).map(String)))];
    
    if (!courseIds.includes(String(material.courseId))) {
      return res.status(403).json({ message: "You cannot delete this material" });
    }

    await Material.findByIdAndDelete(req.params.id);
    await ActivityLog.create({ userId: req.user.id, action: "material_deleted", meta: { materialId: material._id } });
    res.json({ message: "Material deleted successfully" });
  } catch (error) {
    console.error("Material deletion error:", error);
    res.status(500).json({ message: error.message || "Deletion failed" });
  }
});

// Teacher Curriculum/Lessons APIs
const Lesson = require("../models/Lesson");

router.get("/lessons", requirePermission("coding", "materials", "assignments"), async (req, res) => {
  try {
    const scope = await getTeacherContentScope(req);
    const filter = teacherContentFilter(scope, req.query);

    const lessons = await Lesson.find(filter).populate("courseId", "name slug").populate("courseTrackId", "trackName trackCode").sort({ createdAt: 1 }).lean();
    res.json(lessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/lessons", requirePermission("coding", "materials"), async (req, res) => {
  try {
    const scope = teacherScope(req);
    const classes = await ClassSection.find({ _id: { $in: scope.classSectionIds } }).select("courseIds").lean();
    const courseIds = [...new Set(classes.flatMap((row) => (row.courseIds || []).map(String)))];
    
    if (!courseIds.includes(String(req.body.courseId))) {
      return res.status(403).json({ message: "You cannot create lessons for this course" });
    }

    const lesson = await Lesson.create({
      title: req.body.title,
      content: req.body.content || "",
      courseId: req.body.courseId,
      objectives: req.body.objectives || [],
      duration: req.body.duration || 30,
      schoolId: scope.schoolId,
      createdBy: req.user.id
    });

    await ActivityLog.create({ userId: req.user.id, action: "lesson_created", meta: { lessonId: lesson._id } });
    res.status(201).json(lesson);
  } catch (error) {
    console.error("Lesson creation error:", error);
    res.status(500).json({ message: error.message || "Creation failed" });
  }
});

router.put("/lessons/:id", requirePermission("coding", "materials"), async (req, res) => {
  try {
    const scope = teacherScope(req);
    const lesson = await Lesson.findById(req.params.id);
    
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const classes = await ClassSection.find({ _id: { $in: scope.classSectionIds } }).select("courseIds").lean();
    const courseIds = [...new Set(classes.flatMap((row) => (row.courseIds || []).map(String)))];
    
    if (!courseIds.includes(String(lesson.courseId))) {
      return res.status(403).json({ message: "You cannot modify this lesson" });
    }

    if (req.body.title) lesson.title = req.body.title;
    if (req.body.content !== undefined) lesson.content = req.body.content;
    if (req.body.objectives) lesson.objectives = req.body.objectives;
    if (req.body.duration) lesson.duration = req.body.duration;

    await lesson.save();
    await ActivityLog.create({ userId: req.user.id, action: "lesson_updated", meta: { lessonId: lesson._id } });
    res.json(lesson);
  } catch (error) {
    console.error("Lesson update error:", error);
    res.status(500).json({ message: error.message || "Update failed" });
  }
});

router.delete("/lessons/:id", requirePermission("coding", "materials"), async (req, res) => {
  try {
    const scope = teacherScope(req);
    const lesson = await Lesson.findById(req.params.id);
    
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const classes = await ClassSection.find({ _id: { $in: scope.classSectionIds } }).select("courseIds").lean();
    const courseIds = [...new Set(classes.flatMap((row) => (row.courseIds || []).map(String)))];
    
    if (!courseIds.includes(String(lesson.courseId))) {
      return res.status(403).json({ message: "You cannot delete this lesson" });
    }

    await Lesson.findByIdAndDelete(req.params.id);
    await ActivityLog.create({ userId: req.user.id, action: "lesson_deleted", meta: { lessonId: lesson._id } });
    res.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error("Lesson deletion error:", error);
    res.status(500).json({ message: error.message || "Deletion failed" });
  }
});

module.exports = router;
