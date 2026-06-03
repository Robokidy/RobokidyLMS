const express = require("express");
const { isValidObjectId } = require("mongoose");
const { auth, loadUser, requireRole } = require("../middleware/auth");
const User = require("../models/User");
const School = require("../models/School");
const ClassSection = require("../models/ClassSection");
const Material = require("../models/Material");
const Lesson = require("../models/Lesson");
const Question = require("../models/Question");
const Test = require("../models/Test");
const TestAttempt = require("../models/TestAttempt");
const Course = require("../models/Course");
const CourseTrack = require("../models/CourseTrack");
const Attendance = require("../models/Attendance");
const Assignment = require("../models/Assignment");
const FeeAccount = require("../models/FeeAccount");
const StudentProgress = require("../models/StudentProgress");
const ActivityLog = require("../models/ActivityLog");
const Announcement = require("../models/Announcement");
const { DEFAULT_FIRST_PASSWORD, createBulkStudents, ensureUsernameAvailable, generateUniqueUsername } = require("../utils/accounts");
const { calculateFeeStatus, ensureFeeForStudentId, recordPayment, serializeFeeAccount, syncStudentFeeFields } = require("../utils/feeManager");

const router = express.Router();
router.use(auth, loadUser, requireRole("teacher"));

function teacherScope(req) {
  const source = req.authUser || req.user;
  return {
    schoolId: source.schoolId,
    schoolIds: [...new Set([source.schoolId, ...(source.schoolIds || [])].filter(Boolean).map(String))],
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
  if (scope.classSectionIds.length) or.push({ classSectionIds: { $in: scope.classSectionIds } });

  const filter = {};
  if (or.length === 1) Object.assign(filter, or[0]);
  if (or.length > 1) filter.$or = or;
  if (!or.length) filter._id = { $in: [] };

  if (query.courseId && scope.courseIds.includes(String(query.courseId))) filter.courseId = query.courseId;
  if (query.courseTrackId && scope.courseTrackIds.includes(String(query.courseTrackId))) filter.courseTrackId = query.courseTrackId;
  if (query.classSectionId && scope.classSectionIds.includes(String(query.classSectionId))) filter.classSectionIds = { $in: [query.classSectionId] };
  if (query.grade) filter.gradeLevels = { $in: [query.grade] };
  if (query.difficulty) filter.difficulty = query.difficulty;
  if (query.module) filter.module = query.module;
  if (query.chapter) filter.chapter = query.chapter;
  if (query.status) filter.status = query.status;
  if (query.search) filter.$text = { $search: query.search };
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
  const filter = { ...base, schoolId: { $in: scope.schoolIds }, classSectionIds: { $in: scope.classSectionIds } };
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

async function canAccessStudent(req, studentId) {
  const scope = teacherScope(req);
  const student = await User.findOne({ _id: studentId, role: "student", schoolId: { $in: scope.schoolIds }, classSectionIds: { $in: scope.classSectionIds } });
  return student;
}

router.get("/dashboard", async (req, res) => {
  const scope = teacherScope(req);
  const classObjectIds = scope.classSectionIds.filter((id) => isValidObjectId(id));
  const [schools, classes, students, assignments, attendanceAgg, fees, progress, materials, questions, assessments, attempts, recentActivity] = await Promise.all([
    School.find({ _id: { $in: scope.schoolIds } }).select("name code principalName active").lean(),
    ClassSection.find({ _id: { $in: classObjectIds }, schoolId: { $in: scope.schoolIds } }).populate("courseTrackIds", "trackName trackCode category grade").lean(),
    User.find(scopedQuery(req, { role: "student" })).select("username fullName email active classSectionIds").lean(),
    Assignment.countDocuments({ schoolId: { $in: scope.schoolIds }, classSectionId: { $in: scope.classSectionIds }, active: true }),
    Attendance.aggregate([{ $match: { schoolId: { $in: scope.schoolIds }, classSectionId: { $in: scope.classSectionIds } } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    FeeAccount.aggregate([{ $match: { schoolId: { $in: scope.schoolIds }, classSectionId: { $in: scope.classSectionIds } } }, { $group: { _id: null, total: { $sum: "$totalFees" }, paid: { $sum: "$paidAmount" } } }]),
    StudentProgress.find({}).lean(),
    Material.countDocuments({ active: true }),
    Question.countDocuments({ active: { $ne: false } }),
    Test.countDocuments({ status: { $ne: "archived" } }),
    TestAttempt.find({}).populate("studentId", "classSectionIds").lean(),
    ActivityLog.find({ $or: [{ userId: req.user.id }, { action: { $in: ["attendance_marked", "material_uploaded", "lesson_created", "teacher_student_created"] } }] })
      .populate("userId", "username fullName")
      .sort({ createdAt: -1 })
      .limit(12)
      .lean()
  ]);

  const studentIds = new Set(students.map((student) => String(student._id)));
  const scopedProgress = progress.filter((row) => studentIds.has(String(row.userId)));
  const scopedAttempts = attempts.filter((attempt) => {
    const studentClasses = (attempt.studentId?.classSectionIds || []).map(String);
    return studentClasses.some((id) => scope.classSectionIds.includes(id));
  });
  const attendanceTotal = attendanceAgg.reduce((sum, row) => sum + row.count, 0);
  const presentCount = attendanceAgg.find((row) => row._id === "present")?.count || 0;
  const completionRows = scopedProgress.map((row) => row.progressPercentage || row.completionPercentage || 0);
  const courseCompletionRate = completionRows.length ? Math.round(completionRows.reduce((sum, value) => sum + value, 0) / completionRows.length) : 0;
  const avgAttempt = scopedAttempts.length ? Math.round(scopedAttempts.reduce((sum, row) => sum + (row.percentage || 0), 0) / scopedAttempts.length) : 0;

  res.json({
    schools,
    classes,
    assignedSchools: schools.length,
    assignedClasses: classes.length,
    assignedStudents: students.length,
    activeStudents: students.filter((student) => student.active).length,
    activeAssignments: assignments,
    attendancePercentage: attendanceTotal ? Math.round((presentCount / attendanceTotal) * 100) : 0,
    pendingFees: (fees[0]?.total || 0) - (fees[0]?.paid || 0),
    totalMaterialsAssigned: materials,
    totalQuizzesAssigned: questions,
    totalAssessmentsAssigned: assessments,
    courseCompletionRate,
    certificatesIssued: scopedProgress.reduce((sum, row) => sum + ((row.earnedCertificates || []).length), 0),
    codeRuns: scopedProgress.reduce((sum, row) => sum + (row.codeRunCount || 0), 0),
    charts: {
      attendanceTrend: Array.from({ length: 8 }, (_, index) => ({ name: `W${index + 1}`, value: Math.max(0, Math.min(100, (attendanceTotal ? Math.round((presentCount / attendanceTotal) * 100) : 0) - 7 + index * 2)) })),
      assessmentPerformance: Array.from({ length: 6 }, (_, index) => ({ name: `Set ${index + 1}`, score: Math.max(0, Math.min(100, avgAttempt - 10 + index * 4)), quiz: Math.max(0, Math.min(100, avgAttempt - 4 + index * 3)) })),
      operations: [
        { name: "Schools", value: schools.length },
        { name: "Classes", value: classes.length },
        { name: "Students", value: students.length },
        { name: "Materials", value: materials },
        { name: "Assessments", value: assessments }
      ]
    },
    recentActivity: recentActivity.map((row) => ({
      action: row.action,
      username: row.userId?.fullName || row.userId?.username || "System",
      createdAt: row.createdAt
    }))
  });
});

router.get("/classes", async (req, res) => {
  const scope = teacherScope(req);
  const classes = await ClassSection.find({ _id: { $in: scope.classSectionIds }, schoolId: { $in: scope.schoolIds } })
    .populate("schoolId", "name code")
    .populate("teacherIds", "username fullName")
    .populate("classTeacherId", "username fullName")
    .populate("courseIds", "name slug")
    .populate("courseTrackIds", "trackName trackCode category grade")
    .lean();
  const studentCounts = await User.aggregate([
    { $match: { role: "student", schoolId: { $in: scope.schoolIds }, classSectionIds: { $in: classes.map((klass) => klass._id) } } },
    { $unwind: "$classSectionIds" },
    { $match: { classSectionIds: { $in: classes.map((klass) => klass._id) } } },
    { $group: { _id: "$classSectionIds", count: { $sum: 1 } } }
  ]);
  const countMap = new Map(studentCounts.map((row) => [String(row._id), row.count]));
  res.json(classes.map((klass) => ({ ...klass, studentCount: countMap.get(String(klass._id)) || 0 })));
});

router.get("/schools", async (req, res) => {
  const scope = teacherScope(req);
  const [schools, classes, students, attendanceAgg, feeAgg] = await Promise.all([
    School.find({ _id: { $in: scope.schoolIds } }).select("name code principalName active").lean(),
    ClassSection.find({ _id: { $in: scope.classSectionIds }, schoolId: { $in: scope.schoolIds } }).select("name grade section schoolId teacherIds").lean(),
    User.find({ role: "student", schoolId: { $in: scope.schoolIds }, classSectionIds: { $in: scope.classSectionIds } }).select("schoolId classSectionIds active").lean(),
    Attendance.aggregate([{ $match: { schoolId: { $in: scope.schoolIds }, classSectionId: { $in: scope.classSectionIds } } }, { $group: { _id: { schoolId: "$schoolId", status: "$status" }, count: { $sum: 1 } } }]),
    FeeAccount.aggregate([{ $match: { schoolId: { $in: scope.schoolIds }, classSectionId: { $in: scope.classSectionIds } } }, { $group: { _id: "$schoolId", total: { $sum: "$totalFees" }, paid: { $sum: "$paidAmount" } } }])
  ]);
  const classMap = new Map();
  const studentMap = new Map();
  const teacherMap = new Map();
  classes.forEach((klass) => {
    const schoolId = String(klass.schoolId);
    classMap.set(schoolId, (classMap.get(schoolId) || 0) + 1);
    teacherMap.set(schoolId, new Set([...(teacherMap.get(schoolId) || new Set()), ...(klass.teacherIds || []).map(String)]));
  });
  students.forEach((student) => {
    const schoolId = String(student.schoolId);
    studentMap.set(schoolId, (studentMap.get(schoolId) || 0) + 1);
  });
  const attendanceBySchool = new Map();
  attendanceAgg.forEach((row) => {
    const key = String(row._id.schoolId);
    const current = attendanceBySchool.get(key) || { total: 0, present: 0 };
    current.total += row.count;
    if (row._id.status === "present") current.present += row.count;
    attendanceBySchool.set(key, current);
  });
  const feeMap = new Map(feeAgg.map((row) => [String(row._id), row]));
  res.json(schools.map((school) => {
    const attendance = attendanceBySchool.get(String(school._id)) || { total: 0, present: 0 };
    const fees = feeMap.get(String(school._id)) || { total: 0, paid: 0 };
    return {
      ...school,
      classCount: classMap.get(String(school._id)) || 0,
      teacherCount: teacherMap.get(String(school._id))?.size || 0,
      studentCount: studentMap.get(String(school._id)) || 0,
      attendancePercentage: attendance.total ? Math.round((attendance.present / attendance.total) * 100) : 0,
      pendingFees: (fees.total || 0) - (fees.paid || 0)
    };
  }));
});

router.get("/teachers", async (req, res) => {
  const scope = teacherScope(req);
  const teachers = await User.find({
    role: "teacher",
    active: { $ne: false },
    $or: [
      { schoolId: { $in: scope.schoolIds } },
      { schoolIds: { $in: scope.schoolIds } },
      { classSectionIds: { $in: scope.classSectionIds } }
    ]
  })
    .select("fullName username schoolId schoolIds classSectionIds subjects active")
    .populate("schoolId", "name code")
    .populate("classSectionIds", "name grade section")
    .sort({ fullName: 1 })
    .lean();
  res.json(teachers);
});

router.get("/filter-options", async (req, res) => {
  const scope = teacherScope(req);
  const [schools, classes, teachers, courseTracks] = await Promise.all([
    School.find({ _id: { $in: scope.schoolIds } }).select("name code active").lean(),
    ClassSection.find({ _id: { $in: scope.classSectionIds }, schoolId: { $in: scope.schoolIds } }).select("name grade section schoolId subjects codingTracks courseTrackIds active").populate("courseTrackIds", "trackName trackCode category grade active").lean(),
    User.find({ role: "teacher", active: { $ne: false }, $or: [{ schoolId: { $in: scope.schoolIds } }, { schoolIds: { $in: scope.schoolIds } }] }).select("fullName username schoolId schoolIds classSectionIds subjects active").lean(),
    CourseTrack.find({ active: true }).sort({ trackName: 1 }).lean()
  ]);
  const fallbackCourses = classes.flatMap((klass) => klass.courseTrackIds || []);
  const courseMap = new Map(fallbackCourses.map((course) => [String(course._id), course]));
  res.json({
    schools,
    teachers,
    classes,
    courseTracks,
    courses: [...courseMap.values()],
    grades: [...new Set(classes.map((row) => row.grade).filter(Boolean))],
    subjects: [...new Set(classes.flatMap((row) => row.subjects || []).filter(Boolean))]
  });
});

router.get("/username", async (req, res) => {
  if (req.query.username) return res.json(await ensureUsernameAvailable(req.query.username));
  const suggested = await generateUniqueUsername(req.query.seed || req.query.name || "student");
  res.json({ available: true, username: suggested, suggested });
});

router.post("/classes", async (req, res) => {
  const scope = teacherScope(req);
  const requestedSchool = safeText(req.body.schoolId || scope.schoolId);
  if (!scope.schoolIds.includes(String(requestedSchool))) return res.status(403).json({ message: "Teachers can only create classes in assigned schools" });
  const grade = safeText(req.body.grade || req.body.name || "Class");
  const section = safeText(req.body.section || "A");
  const courseIds = toArray(req.body.courseIds);
  const courseTrackIds = toArray(req.body.courseTrackIds);
  const requestedTeacherIds = toArray(req.body.teacherIds);
  const teacherIds = [...new Set([req.user.id, ...requestedTeacherIds].filter(Boolean).map(String))];
  const allowedTeachers = await User.find({ _id: { $in: teacherIds }, role: "teacher", $or: [{ schoolId: requestedSchool }, { schoolIds: requestedSchool }] }).select("_id").lean();
  const finalTeacherIds = allowedTeachers.map((teacher) => teacher._id);
  const classSection = await ClassSection.create({
    schoolId: requestedSchool,
    grade,
    section,
    name: safeText(req.body.name || `${grade} - ${section}`),
    teacherIds: finalTeacherIds,
    classTeacherId: req.body.classTeacherId && finalTeacherIds.some((id) => String(id) === String(req.body.classTeacherId)) ? req.body.classTeacherId : req.user.id,
    courseIds,
    courseTrackIds,
    subjects: toArray(req.body.subjects),
    schedule: safeText(req.body.schedule),
    codingTracks: toArray(req.body.codingTracks),
    capacity: Number(req.body.capacity || Math.max(30, Array.isArray(req.body.students) ? req.body.students.length : 0)),
    feeType: req.body.feeType || "monthly",
    feeAmount: Number(req.body.feeAmount || 0),
    currency: req.body.currency || "INR",
    feeDueDay: Number(req.body.feeDueDay || 5),
    active: req.body.active !== false
  });
  await User.updateMany({ _id: { $in: finalTeacherIds }, role: "teacher" }, { $addToSet: { classSectionIds: classSection._id, schoolIds: requestedSchool }, schoolId: requestedSchool });
  req.authUser.classSectionIds = [...scope.classSectionIds, String(classSection._id)];
  const createdStudents = await createBulkStudents({
    students: req.body.students,
    schoolId: requestedSchool,
    classSectionId: classSection._id,
    grade,
    courseIds,
    trackIds: courseTrackIds,
    createdBy: req.user.id
  });
  await ActivityLog.create({ userId: req.user.id, action: "teacher_class_created", meta: { classSectionId: classSection._id, students: createdStudents.length } });
  res.status(201).json({ classSection, students: createdStudents });
});

router.put("/classes/:id", async (req, res) => {
  const scope = teacherScope(req);
  const classSection = await ClassSection.findOne({ _id: req.params.id, schoolId: { $in: scope.schoolIds }, teacherIds: req.user.id });
  if (!classSection) return res.status(404).json({ message: "Class not found in your assigned schools" });
  const requestedSchool = safeText(req.body.schoolId || classSection.schoolId);
  if (!scope.schoolIds.includes(String(requestedSchool))) return res.status(403).json({ message: "Teachers can only move classes within assigned schools" });
  const requestedTeacherIds = toArray(req.body.teacherIds);
  const teacherIds = [...new Set([req.user.id, ...requestedTeacherIds].filter(Boolean).map(String))];
  const allowedTeachers = await User.find({ _id: { $in: teacherIds }, role: "teacher", $or: [{ schoolId: requestedSchool }, { schoolIds: requestedSchool }] }).select("_id").lean();
  const finalTeacherIds = allowedTeachers.map((teacher) => teacher._id);
  classSection.schoolId = requestedSchool;
  classSection.grade = safeText(req.body.grade || classSection.grade);
  classSection.section = safeText(req.body.section || req.body.name || classSection.section);
  classSection.name = safeText(req.body.name || `${classSection.grade} - ${classSection.section}`);
  classSection.teacherIds = finalTeacherIds;
  classSection.classTeacherId = req.body.classTeacherId && finalTeacherIds.some((id) => String(id) === String(req.body.classTeacherId)) ? req.body.classTeacherId : finalTeacherIds[0];
  classSection.courseIds = toArray(req.body.courseIds);
  classSection.courseTrackIds = toArray(req.body.courseTrackIds);
  classSection.subjects = toArray(req.body.subjects);
  classSection.schedule = safeText(req.body.schedule);
  classSection.codingTracks = toArray(req.body.codingTracks);
  classSection.capacity = Number(req.body.capacity || classSection.capacity || 30);
  classSection.feeType = req.body.feeType || classSection.feeType || "monthly";
  classSection.feeAmount = Number(req.body.feeAmount || 0);
  classSection.currency = req.body.currency || classSection.currency || "INR";
  classSection.feeDueDay = Number(req.body.feeDueDay || classSection.feeDueDay || 5);
  classSection.active = req.body.active !== false;
  await classSection.save();
  await User.updateMany({ role: "teacher", classSectionIds: classSection._id }, { $pull: { classSectionIds: classSection._id } });
  await User.updateMany({ _id: { $in: finalTeacherIds }, role: "teacher" }, { $addToSet: { classSectionIds: classSection._id, schoolIds: requestedSchool }, schoolId: requestedSchool });
  await ActivityLog.create({ userId: req.user.id, action: "teacher_class_updated", meta: { classSectionId: classSection._id } });
  res.json(await classSection.populate([{ path: "schoolId", select: "name code" }, { path: "teacherIds", select: "username fullName" }, { path: "courseIds", select: "name slug" }]));
});

router.delete("/classes/:id", async (req, res) => {
  const scope = teacherScope(req);
  const classSection = await ClassSection.findOneAndUpdate({ _id: req.params.id, schoolId: { $in: scope.schoolIds }, teacherIds: req.user.id }, { active: false }, { new: true });
  if (!classSection) return res.status(404).json({ message: "Class not found in your assigned schools" });
  await ActivityLog.create({ userId: req.user.id, action: "teacher_class_archived", meta: { classSectionId: classSection._id } });
  res.json({ message: "Class archived" });
});

router.get("/students", async (req, res) => {
  const scope = teacherScope(req);
  const students = await User.find(scopedQuery(req, { role: "student" }))
    .select("username fullName email phone studentId rollNumber parentName parentContact grade feeStructure profilePhotoUrl active assignedCourses assignedTrackIds classSectionIds schoolId feeAmount paidAmount pendingAmount feeStatus lastPaymentDate")
    .populate("schoolId", "name code")
    .populate("classSectionIds", "name grade section")
    .populate("assignedCourses", "name slug")
    .populate("assignedTrackIds", "trackName trackCode category grade")
    .lean();
  const [progress, fees] = await Promise.all([
    StudentProgress.find({ userId: { $in: students.map((student) => student._id) } }).lean(),
    FeeAccount.find({ studentId: { $in: students.map((student) => student._id) } }).lean()
  ]);
  const progressMap = new Map(progress.map((row) => [String(row.userId), row]));
  const feeMap = new Map(fees.map((fee) => [String(fee.studentId), serializeFeeAccount(fee)]));
  res.json(students.map((student) => ({ ...student, progress: progressMap.get(String(student._id)) || null, feeAccount: feeMap.get(String(student._id)) || null })));
});

router.get("/classes/:classId/students", async (req, res) => {
  const scope = teacherScope(req);
  
  // Verify teacher has access to this class
  if (!scope.classSectionIds.includes(String(req.params.classId))) {
    return res.status(403).json({ message: "You do not have access to this class" });
  }

  const students = await User.find({ 
    role: "student",
    classSectionIds: req.params.classId,
    schoolId: { $in: scope.schoolIds }
  })
    .select("_id username fullName email studentId rollNumber profilePhotoUrl active")
    .lean();
  
  res.json(students);
});

router.post("/students", async (req, res) => {
  const scope = teacherScope(req);
  const classSectionIds = toArray(req.body.classSectionIds);
  if (!classSectionIds.length) return res.status(400).json({ message: "Assign at least one class" });
  if (!classSectionIds.every((id) => scope.classSectionIds.includes(String(id)))) {
    return res.status(403).json({ message: "Students can only be assigned to your classes" });
  }
  const assignedCourses = toArray(req.body.assignedCourses);
  const assignedTrackIds = toArray(req.body.assignedTrackIds);
  const classes = await ClassSection.find({ _id: { $in: classSectionIds }, schoolId: { $in: scope.schoolIds } }).select("schoolId courseIds courseTrackIds grade").lean();
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
    schoolId: classes[0]?.schoolId || scope.schoolId,
    classSectionIds,
    active: req.body.active !== false
  });
  await Promise.all([
    StudentProgress.create({ userId: student._id, completedLessons: [], quizAttempts: [], codeRunCount: 0 }),
    ensureFeeForStudentId(student._id, req.body.customFeeAmount, req.user.id),
    ActivityLog.create({ userId: req.user.id, action: "teacher_student_created", meta: { studentId: student._id, username } })
  ]);
  res.status(201).json({ id: student._id, username: student.username, tempPassword });
});

router.put("/students/:id", async (req, res) => {
  const scope = teacherScope(req);
  const student = await User.findOne({ _id: req.params.id, role: "student", schoolId: { $in: scope.schoolIds }, classSectionIds: { $in: scope.classSectionIds } });
  if (!student) return res.status(404).json({ message: "Student not found in your assigned classes" });
  const classSectionIds = toArray(req.body.classSectionIds);
  if (classSectionIds.length && !classSectionIds.every((id) => scope.classSectionIds.includes(String(id)))) return res.status(403).json({ message: "Invalid class assignment" });
  const assignedCourses = toArray(req.body.assignedCourses);
  const assignedTrackIds = toArray(req.body.assignedTrackIds);
  if (classSectionIds.length) {
    const classes = await ClassSection.find({ _id: { $in: classSectionIds }, schoolId: { $in: scope.schoolIds } }).select("courseIds courseTrackIds").lean();
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
  await ensureFeeForStudentId(student._id, req.body.customFeeAmount, req.user.id);
  await ActivityLog.create({ userId: req.user.id, action: "teacher_student_updated", meta: { studentId: student._id } });
  res.json(await student.populate([{ path: "classSectionIds", select: "name grade section" }, { path: "assignedCourses", select: "name slug" }, { path: "assignedTrackIds", select: "trackName trackCode category grade" }]));
});

router.delete("/students/:id", async (req, res) => {
  const scope = teacherScope(req);
  const student = await User.findOneAndUpdate({ _id: req.params.id, role: "student", schoolId: { $in: scope.schoolIds }, classSectionIds: { $in: scope.classSectionIds } }, { active: false }, { new: true });
  if (!student) return res.status(404).json({ message: "Student not found in your assigned classes" });
  await ActivityLog.create({ userId: req.user.id, action: "teacher_student_deactivated", meta: { studentId: student._id } });
  res.json({ message: "Student deactivated" });
});

router.post("/attendance", async (req, res) => {
  if (!(await canAccessClass(req, req.body.classSectionId))) return res.status(403).json({ message: "Class is not assigned to you" });
  const classSection = await ClassSection.findById(req.body.classSectionId).select("schoolId").lean();
  if (!classSection) return res.status(400).json({ message: "Valid class is required" });
  const rows = Array.isArray(req.body.records) ? req.body.records : [];
  const date = new Date(req.body.date || Date.now());
  const writes = rows.map((row) => ({
    updateOne: {
      filter: { classSectionId: req.body.classSectionId, studentId: row.studentId, date },
      update: {
        $set: {
          schoolId: classSection.schoolId,
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

router.get("/attendance", async (req, res) => {
  const scope = teacherScope(req);
  const filter = { schoolId: { $in: scope.schoolIds }, classSectionId: { $in: scope.classSectionIds } };
  if (req.query.classSectionId && scope.classSectionIds.includes(String(req.query.classSectionId))) filter.classSectionId = req.query.classSectionId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.dateFrom || req.query.dateTo) filter.date = {};
  if (req.query.dateFrom) filter.date.$gte = new Date(req.query.dateFrom);
  if (req.query.dateTo) filter.date.$lte = new Date(req.query.dateTo);
  res.json(await Attendance.find(filter).populate("studentId", "username fullName").populate("classSectionId", "name grade section").sort({ date: -1 }).limit(500).lean());
});

router.get("/assignments", async (req, res) => {
  const scope = teacherScope(req);
  const filter = { schoolId: scope.schoolId, classSectionId: { $in: scope.classSectionIds } };
  if (req.query.classSectionId && scope.classSectionIds.includes(String(req.query.classSectionId))) filter.classSectionId = req.query.classSectionId;
  if (req.query.courseId) filter.courseId = req.query.courseId;
  res.json(await Assignment.find(filter).populate("classSectionId", "name grade section").populate("courseId", "name slug").sort({ createdAt: -1 }).lean());
});

router.post("/assignments", async (req, res) => {
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

router.put("/assignments/:id/submissions/:submissionId", async (req, res) => {
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

router.get("/fees", async (req, res) => {
  const scope = teacherScope(req);
  const filter = { schoolId: { $in: scope.schoolIds }, classSectionId: { $in: scope.classSectionIds } };
  if (req.query.classSectionId && scope.classSectionIds.includes(String(req.query.classSectionId))) filter.classSectionId = req.query.classSectionId;
  if (req.query.schoolId && scope.schoolIds.includes(String(req.query.schoolId))) filter.schoolId = req.query.schoolId;
  if (req.query.status) filter.status = req.query.status;
  const rows = await FeeAccount.find(filter).populate("schoolId", "name code").populate("studentId", "username fullName rollNumber").populate("classSectionId", "name grade section").sort({ dueDate: 1 }).lean();
  res.json(rows.map(serializeFeeAccount));
});

router.post("/fees", async (req, res) => {
  const scope = teacherScope(req);
  const student = await canAccessStudent(req, req.body.studentId);
  if (!student) return res.status(403).json({ message: "Student is not assigned to you" });
  const classSectionId = req.body.classSectionId || student.classSectionIds?.[0];
  if (!scope.classSectionIds.includes(String(classSectionId))) return res.status(403).json({ message: "Class is not assigned to you" });
  const totalFees = Number(req.body.totalFees || 0);
  const paidAmount = Number(req.body.paidAmount || 0);
  const fee = await FeeAccount.findOneAndUpdate(
    { studentId: student._id },
    {
      schoolId: req.body.schoolId || student.schoolId,
      classSectionId,
      studentId: student._id,
      feeType: req.body.feeType || "custom",
      totalFees,
      paidAmount,
      currency: safeText(req.body.currency || "INR"),
      dueDate: req.body.dueDate || undefined,
      notes: safeText(req.body.notes),
      status: calculateFeeStatus(totalFees, paidAmount, req.body.dueDate, req.body.status),
      customOverride: true,
      updatedBy: req.user.id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await syncStudentFeeFields(fee.studentId, fee);
  await ActivityLog.create({ userId: req.user.id, action: "teacher_fee_account_updated", meta: { feeAccountId: fee._id, studentId: fee.studentId } });
  res.status(201).json(serializeFeeAccount(fee));
});

router.put("/fees/:id", async (req, res) => {
  const scope = teacherScope(req);
  const fee = await FeeAccount.findOne({ _id: req.params.id, schoolId: { $in: scope.schoolIds }, classSectionId: { $in: scope.classSectionIds } });
  if (!fee) return res.status(404).json({ message: "Fee account not found in your assigned classes" });
  const student = await canAccessStudent(req, req.body.studentId || fee.studentId);
  if (!student) return res.status(403).json({ message: "Student is not assigned to you" });
  const classSectionId = req.body.classSectionId || fee.classSectionId;
  if (!scope.classSectionIds.includes(String(classSectionId))) return res.status(403).json({ message: "Class is not assigned to you" });
  const totalFees = Number(req.body.totalFees || 0);
  const paidAmount = Number(req.body.paidAmount || 0);
  fee.schoolId = req.body.schoolId || student.schoolId;
  fee.classSectionId = classSectionId;
  fee.studentId = student._id;
  fee.feeType = req.body.feeType || fee.feeType || "custom";
  fee.totalFees = totalFees;
  fee.paidAmount = paidAmount;
  fee.currency = safeText(req.body.currency || fee.currency || "INR");
  fee.dueDate = req.body.dueDate || undefined;
  fee.notes = safeText(req.body.notes);
  fee.status = calculateFeeStatus(totalFees, paidAmount, fee.dueDate, req.body.status);
  fee.customOverride = true;
  fee.updatedBy = req.user.id;
  await fee.save();
  await syncStudentFeeFields(fee.studentId, fee);
  await ActivityLog.create({ userId: req.user.id, action: "teacher_fee_account_updated", meta: { feeAccountId: fee._id } });
  res.json(serializeFeeAccount(fee));
});

router.post("/fees/:id/payments", async (req, res) => {
  const scope = teacherScope(req);
  const existing = await FeeAccount.findOne({ _id: req.params.id, schoolId: { $in: scope.schoolIds }, classSectionId: { $in: scope.classSectionIds } });
  if (!existing) return res.status(404).json({ message: "Fee account not found in your assigned classes" });
  try {
    const fee = await recordPayment({
      feeAccountId: existing._id,
      amount: req.body.amount,
      method: safeText(req.body.method || "cash"),
      reference: safeText(req.body.reference),
      receiptNo: safeText(req.body.receiptNo || `R-${Date.now()}`),
      remarks: safeText(req.body.remarks),
      paymentDate: req.body.paymentDate,
      updatedBy: req.user.id
    });
    await ActivityLog.create({ userId: req.user.id, action: "teacher_fee_payment_recorded", meta: { feeAccountId: fee._id, amount: Number(req.body.amount || 0) } });
    res.json(serializeFeeAccount(fee));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/fees/:id", async (req, res) => {
  const scope = teacherScope(req);
  const fee = await FeeAccount.findOneAndDelete({ _id: req.params.id, schoolId: { $in: scope.schoolIds }, classSectionId: { $in: scope.classSectionIds } });
  if (!fee) return res.status(404).json({ message: "Fee account not found in your assigned classes" });
  await ActivityLog.create({ userId: req.user.id, action: "teacher_fee_account_deleted", meta: { feeAccountId: fee._id } });
  res.json({ message: "Fee account deleted" });
});

router.put("/students/:id/fees", async (req, res) => {
  const scope = teacherScope(req);
  const student = await canAccessStudent(req, req.params.id);
  if (!student) return res.status(404).json({ message: "Student not found in your assigned classes" });
  const classSectionId = req.body.classSectionId || student.classSectionIds?.[0];
  if (!scope.classSectionIds.includes(String(classSectionId))) return res.status(403).json({ message: "Class is not assigned to you" });
  const totalFees = Number(req.body.totalFees || student.feeAmount || 0);
  const paidAmount = req.body.status === "paid" ? totalFees : Number(req.body.paidAmount || req.body.amountPaid || 0);
  const fee = await FeeAccount.findOneAndUpdate(
    { studentId: student._id },
    {
      schoolId: student.schoolId,
      classSectionId,
      studentId: student._id,
      feeType: req.body.feeType || "custom",
      totalFees,
      paidAmount,
      currency: safeText(req.body.currency || "INR"),
      dueDate: req.body.dueDate || undefined,
      notes: safeText(req.body.notes),
      status: calculateFeeStatus(totalFees, paidAmount, req.body.dueDate, req.body.status),
      customOverride: true,
      updatedBy: req.user.id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await syncStudentFeeFields(fee.studentId, fee);
  await ActivityLog.create({ userId: req.user.id, action: "teacher_student_fee_updated", meta: { studentId: student._id, feeAccountId: fee._id } });
  res.json(serializeFeeAccount(fee));
});

router.get("/materials", async (req, res) => {
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

router.get("/courses", async (req, res) => {
  try {
    res.json(await Course.find({ active: true }).sort({ name: 1 }).lean());
  } catch (error) {
    console.error("Error fetching teacher courses:", error);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

router.get("/notifications", async (req, res) => {
  const scope = teacherScope(req);
  const rows = await Announcement.find({
    schoolId: { $in: scope.schoolIds },
    $or: [
      { classSectionId: { $in: scope.classSectionIds } },
      { classSectionId: null },
      { classSectionId: { $exists: false } },
      { createdBy: req.user.id }
    ]
  }).sort({ createdAt: -1 }).limit(300).lean();
  res.json(rows);
});

async function saveTeacherNotification(req, res, existing) {
  if (req.body.classSectionId && !(await canAccessClass(req, req.body.classSectionId))) return res.status(403).json({ message: "Class is not assigned to you" });
  const scope = teacherScope(req);
  const schoolId = req.body.schoolId && scope.schoolIds.includes(String(req.body.schoolId)) ? req.body.schoolId : scope.schoolIds[0];
  const announcement = existing || new Announcement({ createdBy: req.user.id });
  announcement.schoolId = schoolId;
  announcement.classSectionId = req.body.classSectionId || undefined;
  announcement.audience = req.body.audience || (req.body.classSectionId ? "class" : "students");
  announcement.title = String(req.body.title || "").trim();
  announcement.body = String(req.body.body || "").trim();
  announcement.active = req.body.active !== false;
  await announcement.save();
  await ActivityLog.create({ userId: req.user.id, action: "announcement_created", meta: { announcementId: announcement._id } });
  res.status(existing ? 200 : 201).json(announcement);
}

router.post("/announcements", async (req, res) => {
  return saveTeacherNotification(req, res);
});

router.post("/notifications", async (req, res) => {
  return saveTeacherNotification(req, res);
});

router.put("/notifications/:id", async (req, res) => {
  const scope = teacherScope(req);
  const announcement = await Announcement.findOne({ _id: req.params.id, schoolId: { $in: scope.schoolIds }, createdBy: req.user.id });
  if (!announcement) return res.status(404).json({ message: "Notification not found" });
  return saveTeacherNotification(req, res, announcement);
});

router.delete("/notifications/:id", async (req, res) => {
  const scope = teacherScope(req);
  const announcement = await Announcement.findOneAndUpdate({ _id: req.params.id, schoolId: { $in: scope.schoolIds }, createdBy: req.user.id }, { active: false }, { new: true });
  if (!announcement) return res.status(404).json({ message: "Notification not found" });
  res.json({ message: "Notification archived" });
});

// Teacher Materials APIs - Upload, Update, Delete
router.post("/materials", async (req, res) => {
  return res.status(410).json({ message: "Material uploads now use /api/materials/upload with Cloudinary storage." });
/*
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
*/
});

router.put("/materials/:id", async (req, res) => {
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

router.delete("/materials/:id", async (req, res) => {
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

router.get("/lessons", async (req, res) => {
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

router.post("/lessons", async (req, res) => {
  try {
    const scope = teacherScope(req);
    const classes = await ClassSection.find({ _id: { $in: scope.classSectionIds } }).select("courseIds").lean();
    const courseIds = [...new Set(classes.flatMap((row) => (row.courseIds || []).map(String)))];
    
    if (!courseIds.includes(String(req.body.courseId))) {
      return res.status(403).json({ message: "You cannot create lessons for this course" });
    }

    const classSectionIds = Array.isArray(req.body.classSectionIds)
      ? req.body.classSectionIds.filter((id) => scope.classSectionIds.includes(String(id)))
      : [];

    const lesson = await Lesson.create({
      title: req.body.title,
      description: req.body.description || "",
      content: req.body.content || "",
      contentMarkdown: req.body.contentMarkdown || "",
      courseId: req.body.courseId,
      module: req.body.module || "",
      chapter: req.body.chapter || "",
      courseTrackId: req.body.courseTrackId || null,
      objectives: req.body.objectives || [],
      keyPoints: req.body.keyPoints || [],
      duration: req.body.duration || 30,
      difficulty: req.body.difficulty || "medium",
      tags: req.body.tags || [],
      visibility: req.body.visibility || "course",
      gradeLevels: req.body.gradeLevels || [],
      classSectionIds,
      unlockType: req.body.unlockType || "manual",
      unlockDate: req.body.unlockDate || null,
      unlockAfterLessonIds: req.body.unlockAfterLessonIds || [],
      unlockAfterAssessmentId: req.body.unlockAfterAssessmentId || null,
      unlockRequiresApproval: req.body.unlockRequiresApproval || false,
      thumbnailUrl: req.body.thumbnailUrl || "",
      bannerUrl: req.body.bannerUrl || "",
      coverUrl: req.body.coverUrl || "",
      contentBlocks: req.body.contentBlocks || [],
      attachments: req.body.attachments || [],
      prerequisites: req.body.prerequisites || [],
      status: req.body.status || "draft",
      isPublished: req.body.isPublished || false,
      publishedDate: req.body.isPublished ? new Date() : null,
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

router.put("/lessons/:id", async (req, res) => {
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
    if (req.body.description !== undefined) lesson.description = req.body.description;
    if (req.body.content !== undefined) lesson.content = req.body.content;
    if (req.body.contentMarkdown !== undefined) lesson.contentMarkdown = req.body.contentMarkdown;
    if (req.body.courseId && courseIds.includes(String(req.body.courseId))) lesson.courseId = req.body.courseId;
    if (req.body.module !== undefined) lesson.module = req.body.module;
    if (req.body.chapter !== undefined) lesson.chapter = req.body.chapter;
    if (req.body.courseTrackId !== undefined) lesson.courseTrackId = req.body.courseTrackId;
    if (req.body.objectives) lesson.objectives = req.body.objectives;
    if (req.body.keyPoints) lesson.keyPoints = req.body.keyPoints;
    if (req.body.duration !== undefined) lesson.duration = req.body.duration;
    if (req.body.difficulty !== undefined) lesson.difficulty = req.body.difficulty;
    if (req.body.tags) lesson.tags = req.body.tags;
    if (req.body.visibility) lesson.visibility = req.body.visibility;
    if (req.body.gradeLevels) lesson.gradeLevels = req.body.gradeLevels;
    if (req.body.classSectionIds) {
      lesson.classSectionIds = req.body.classSectionIds.filter((id) => scope.classSectionIds.includes(String(id)));
    }
    if (req.body.unlockType !== undefined) lesson.unlockType = req.body.unlockType;
    if (req.body.unlockDate !== undefined) lesson.unlockDate = req.body.unlockDate;
    if (req.body.unlockAfterLessonIds) lesson.unlockAfterLessonIds = req.body.unlockAfterLessonIds;
    if (req.body.unlockAfterAssessmentId !== undefined) lesson.unlockAfterAssessmentId = req.body.unlockAfterAssessmentId;
    if (req.body.unlockRequiresApproval !== undefined) lesson.unlockRequiresApproval = req.body.unlockRequiresApproval;
    if (req.body.thumbnailUrl !== undefined) lesson.thumbnailUrl = req.body.thumbnailUrl;
    if (req.body.bannerUrl !== undefined) lesson.bannerUrl = req.body.bannerUrl;
    if (req.body.coverUrl !== undefined) lesson.coverUrl = req.body.coverUrl;
    if (req.body.contentBlocks) lesson.contentBlocks = req.body.contentBlocks;
    if (req.body.attachments) lesson.attachments = req.body.attachments;
    if (req.body.prerequisites) lesson.prerequisites = req.body.prerequisites;
    if (req.body.status) lesson.status = req.body.status;
    if (req.body.isPublished !== undefined) {
      lesson.isPublished = req.body.isPublished;
      if (req.body.isPublished && !lesson.publishedDate) lesson.publishedDate = new Date();
    }

    await lesson.save();
    await ActivityLog.create({ userId: req.user.id, action: "lesson_updated", meta: { lessonId: lesson._id } });
    res.json(lesson);
  } catch (error) {
    console.error("Lesson update error:", error);
    res.status(500).json({ message: error.message || "Update failed" });
  }
});

router.delete("/lessons/:id", async (req, res) => {
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
