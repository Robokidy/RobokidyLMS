const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const User = require("../models/User");
const School = require("../models/School");
const ClassSection = require("../models/ClassSection");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Material = require("../models/Material");
const Attendance = require("../models/Attendance");
const TeacherAttendance = require("../models/TeacherAttendance");
const TeacherWorkLog = require("../models/TeacherWorkLog");
const Test = require("../models/Test");
const TestAttempt = require("../models/TestAttempt");
const Quiz = require("../models/Quiz");

const router = express.Router();
router.use(auth, requireRole("admin", "cto"));

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pct(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function nameOf(entity) {
  return entity?.fullName || entity?.name || entity?.title || entity?.username || "";
}

function toId(value) {
  return String(value?._id || value || "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getDateRange(query) {
  const now = new Date();
  const preset = query.period || "monthly";
  let start;
  let end = endOfDay(query.endDate ? new Date(query.endDate) : now);

  if (query.startDate && query.endDate) {
    return { start: startOfDay(new Date(query.startDate)), end };
  }

  if (preset === "daily") start = startOfDay(now);
  else if (preset === "weekly") {
    start = startOfDay(now);
    start.setDate(start.getDate() - 6);
  } else if (preset === "quarterly") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    start = startOfDay(new Date(now.getFullYear(), quarterStartMonth, 1));
  } else if (preset === "yearly") {
    start = startOfDay(new Date(now.getFullYear(), 0, 1));
  } else {
    start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  return { start, end };
}

function actionItems({ coverageRows, attendanceSummary, studentPerformance, quizAnalytics }) {
  const items = [];
  coverageRows.filter((row) => row.coveragePercentage < 80).slice(0, 5).forEach((row) => {
    items.push(`${row.className} ${row.courseName} curriculum is ${row.coveragePercentage}% complete. Pending lessons: ${row.pendingLessons}.`);
  });
  attendanceSummary.classLevel.filter((row) => row.attendancePercentage < 80).slice(0, 5).forEach((row) => {
    items.push(`${row.className} attendance dropped below 80% during this period.`);
  });
  if (quizAnalytics.totalQuizzesConducted > 0 && quizAnalytics.averageScore < 60) {
    items.push("Quiz average is below 60%; schedule revision and remedial practice.");
  }
  studentPerformance.filter((row) => row.overallScore < 60).slice(0, 5).forEach((row) => {
    items.push(`${row.studentName} needs improvement based on combined attendance and assessment performance.`);
  });
  if (!items.length) items.push("Academic delivery is on track for the selected period.");
  return items;
}

router.get("/school-academic", async (req, res) => {
  const { schoolId } = req.query;
  if (!schoolId) return res.status(400).json({ message: "schoolId is required" });

  const { start, end } = getDateRange(req.query);
  const school = await School.findById(schoolId).lean();
  if (!school) return res.status(404).json({ message: "School not found" });

  const [classes, teachers, students, courses] = await Promise.all([
    ClassSection.find({ schoolId, active: true }).populate("courseIds", "name").lean(),
    User.find({ role: "teacher", active: true, $or: [{ schoolId }, { schoolIds: schoolId }] }).select("fullName username schoolId schoolIds classSectionIds").lean(),
    User.find({ role: "student", schoolId, active: true }).select("fullName username grade classSectionIds").lean(),
    Course.find({ active: true }).select("name").lean()
  ]);

  const classIds = classes.map((row) => row._id);
  const classNameMap = new Map(classes.map((row) => [toId(row), row.name]));
  const teacherNameMap = new Map(teachers.map((row) => [toId(row), nameOf(row)]));
  const courseNameMap = new Map(courses.map((row) => [toId(row), row.name]));

  const [
    workLogs,
    studentAttendance,
    teacherAttendance,
    lessons,
    materials,
    tests,
    attempts,
    quizzes
  ] = await Promise.all([
    TeacherWorkLog.find({ schoolId, date: { $gte: start, $lte: end } })
      .populate("teacherId", "fullName username")
      .populate("classSectionId", "name grade")
      .populate("courseId", "name")
      .populate("lessonId", "title")
      .lean(),
    Attendance.find({ schoolId, date: { $gte: start, $lte: end } }).populate("studentId", "fullName username grade classSectionIds").populate("classSectionId", "name grade").lean(),
    TeacherAttendance.find({ schoolId, date: { $gte: start, $lte: end } }).populate("teacherId", "fullName username").lean(),
    Lesson.find({ active: { $ne: false }, $or: [{ schoolId }, { schoolId: { $exists: false } }, { schoolId: null }] }).select("title courseId classSectionIds grade").lean(),
    Material.find({ active: true, createdAt: { $lte: end }, $or: [{ schoolId }, { schoolId: null }, { classSectionIds: { $in: classIds } }] }).select("title type schoolId classSectionIds createdAt").lean(),
    Test.find({ createdAt: { $gte: start, $lte: end }, $or: [{ schoolId }, { "assignedTo.schools": schoolId }, { classSectionIds: { $in: classIds } }, { "assignedTo.classes": { $in: classIds } }] }).lean(),
    TestAttempt.find({ schoolId, createdAt: { $gte: start, $lte: end }, status: { $in: ["submitted", "evaluated"] } }).populate("studentId", "fullName username grade classSectionIds").lean(),
    Quiz.find({ createdAt: { $gte: start, $lte: end }, $or: [{ schoolId }, { classSectionIds: { $in: classIds } }] }).lean()
  ]);

  const completedLessonIds = new Set(workLogs.map((row) => toId(row.lessonId)).filter(Boolean));
  const topicsCovered = workLogs.flatMap((row) => String(row.topicCovered || "").split(/,|\n/).map((item) => item.trim()).filter(Boolean));
  const classesConducted = workLogs.length;
  const teachingHours = Math.round((workLogs.reduce((sum, row) => sum + Number(row.durationMinutes || 0), 0) / 60) * 10) / 10;
  const homeworkAssigned = workLogs.filter((row) => row.homeworkGiven).length;
  const assessmentsFromLogs = workLogs.filter((row) => row.assessmentConducted).length;

  const coverageRows = classes.flatMap((klass) => {
    const courseIds = klass.courseIds?.length ? klass.courseIds.map(toId) : unique(workLogs.filter((log) => toId(log.classSectionId) === toId(klass)).map((log) => toId(log.courseId)));
    return (courseIds.length ? courseIds : [""]).map((courseId) => {
      const planned = lessons.filter((lesson) => {
        const sameCourse = !courseId || toId(lesson.courseId) === courseId;
        const assignedClass = !lesson.classSectionIds?.length || lesson.classSectionIds.map(toId).includes(toId(klass));
        const assignedGrade = !lesson.grade || lesson.grade === klass.grade;
        return sameCourse && assignedClass && assignedGrade;
      });
      const completed = planned.filter((lesson) => completedLessonIds.has(toId(lesson))).length;
      return {
        grade: klass.grade,
        className: klass.name,
        courseName: courseNameMap.get(courseId) || "General",
        plannedLessons: planned.length,
        completedLessons: completed,
        coveragePercentage: pct(completed, planned.length),
        pendingLessons: Math.max(0, planned.length - completed)
      };
    });
  });

  const attendancePresent = studentAttendance.filter((row) => ["present", "late"].includes(row.status)).length;
  const studentAttendanceRows = studentAttendance.map((row) => ({
    date: row.date,
    studentName: nameOf(row.studentId),
    grade: row.classSectionId?.grade || row.studentId?.grade || "",
    className: nameOf(row.classSectionId),
    status: row.status
  }));
  const classLevel = classes.map((klass) => {
    const rows = studentAttendance.filter((row) => toId(row.classSectionId) === toId(klass));
    const present = rows.filter((row) => ["present", "late"].includes(row.status)).length;
    return { className: klass.name, present, absent: rows.length - present, attendancePercentage: pct(present, rows.length) };
  });
  const teacherPresent = teacherAttendance.filter((row) => ["present", "half-day", "work-from-home"].includes(row.status)).length;

  const attemptsByStudent = new Map();
  attempts.forEach((attempt) => {
    const key = toId(attempt.studentId);
    if (!attemptsByStudent.has(key)) attemptsByStudent.set(key, []);
    attemptsByStudent.get(key).push(attempt);
  });
  const studentAttendanceById = new Map();
  studentAttendance.forEach((row) => {
    const key = toId(row.studentId);
    const current = studentAttendanceById.get(key) || { present: 0, total: 0 };
    current.total += 1;
    if (["present", "late"].includes(row.status)) current.present += 1;
    studentAttendanceById.set(key, current);
  });
  const studentPerformance = students.map((student) => {
    const studentAttempts = attemptsByStudent.get(toId(student)) || [];
    const assessmentAverage = studentAttempts.length ? Math.round(studentAttempts.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0) / studentAttempts.length) : 0;
    const attendance = studentAttendanceById.get(toId(student)) || { present: 0, total: 0 };
    const attendancePercentage = pct(attendance.present, attendance.total);
    return {
      studentName: nameOf(student),
      grade: student.grade || "",
      className: (student.classSectionIds || []).map((id) => classNameMap.get(toId(id))).filter(Boolean).join(", "),
      assessmentAverage,
      quizAverage: assessmentAverage,
      attendancePercentage,
      overallScore: Math.round((assessmentAverage + attendancePercentage) / 2)
    };
  }).sort((a, b) => b.overallScore - a.overallScore);

  const scores = attempts.map((attempt) => Number(attempt.percentage || 0));
  const averageScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  const classQuizStats = classes.map((klass) => {
    const rows = attempts.filter((attempt) => toId(attempt.classId || attempt.sectionId) === toId(klass));
    const avg = rows.length ? Math.round(rows.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0) / rows.length) : 0;
    return { className: klass.name, averageScore: avg, attempts: rows.length };
  }).filter((row) => row.attempts);

  const teacherPerformance = teachers.map((teacher) => {
    const logs = workLogs.filter((row) => toId(row.teacherId) === toId(teacher));
    const attendanceRows = teacherAttendance.filter((row) => toId(row.teacherId) === toId(teacher));
    const present = attendanceRows.filter((row) => ["present", "half-day", "work-from-home"].includes(row.status)).length;
    return {
      teacherName: nameOf(teacher),
      classesConducted: logs.length,
      teachingHours: Math.round((logs.reduce((sum, row) => sum + Number(row.durationMinutes || 0), 0) / 60) * 10) / 10,
      lessonsCompleted: unique(logs.map((row) => toId(row.lessonId))).length,
      topicsCovered: unique(logs.flatMap((row) => String(row.topicCovered || "").split(/,|\n/).map((item) => item.trim()))).length,
      attendancePercentage: pct(present, attendanceRows.length)
    };
  });

  const materialsUtilized = materials.filter((material) => {
    const titlePattern = new RegExp(escapeRegex(material.title), "i");
    return workLogs.some((log) => (log.materialIds || []).map(toId).includes(toId(material)) || titlePattern.test(log.materialsUsed || ""));
  });
  const materialCounts = materialsUtilized.reduce((acc, material) => {
    acc[material.type] = (acc[material.type] || 0) + 1;
    return acc;
  }, {});
  const achievements = {
    certificatesIssued: 0,
    assessmentToppers: studentPerformance.slice(0, 5),
    bestAttendanceStudents: studentPerformance.filter((row) => row.attendancePercentage >= 95).slice(0, 5),
    mostImprovedStudents: [],
    topPerformingClass: classQuizStats.sort((a, b) => b.averageScore - a.averageScore)[0]?.className || "",
    topPerformingTeacher: teacherPerformance.sort((a, b) => b.classesConducted - a.classesConducted)[0]?.teacherName || ""
  };

  const report = {
    school: { id: toId(school), name: school.name, code: school.code || school.name },
    period: { type: req.query.period || "monthly", start, end },
    executiveSummary: {
      schoolName: school.name,
      dateRange: `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
      gradesCovered: unique(classes.map((row) => row.grade)),
      classesCovered: classes.map((row) => row.name),
      teachersAssigned: teachers.length,
      studentsEnrolled: students.length,
      studentsActive: students.filter((row) => row.active !== false).length,
      reportGeneratedDate: new Date(),
      generatedBy: req.user?.username || "Admin"
    },
    academicDelivery: {
      totalClassesConducted: classesConducted,
      totalTeachingHours: teachingHours,
      totalLessonsCompleted: completedLessonIds.size,
      totalTopicsCovered: unique(topicsCovered).length,
      totalMaterialsShared: materials.length,
      totalHomeworkAssigned: homeworkAssigned,
      totalAssessmentsConducted: tests.length + assessmentsFromLogs,
      totalQuizzesConducted: quizzes.length,
      totalCertificatesIssued: 0
    },
    curriculumCoverage: coverageRows,
    topicsCovered: workLogs.map((row) => ({
      date: row.date,
      teacher: nameOf(row.teacherId),
      className: nameOf(row.classSectionId),
      course: nameOf(row.courseId),
      lesson: row.lessonConducted || nameOf(row.lessonId),
      topicsCovered: row.topicCovered,
      durationHours: Math.round((Number(row.durationMinutes || 0) / 60) * 10) / 10
    })),
    attendanceSummary: {
      schoolLevel: { present: attendancePresent, absent: studentAttendance.length - attendancePresent, attendancePercentage: pct(attendancePresent, studentAttendance.length) },
      classLevel,
      studentAttendance: studentAttendanceRows,
      teacherAttendance: teacherAttendance.map((row) => ({ date: row.date, teacherName: nameOf(row.teacherId), status: row.status, totalHours: row.totalHours || 0 })),
      teacherLevel: { present: teacherPresent, absent: teacherAttendance.length - teacherPresent, attendancePercentage: pct(teacherPresent, teacherAttendance.length) }
    },
    studentPerformance,
    assessmentAnalytics: {
      totalAssessments: tests.length,
      assessmentParticipation: attempts.length,
      highestScore: scores.length ? Math.max(...scores) : 0,
      lowestScore: scores.length ? Math.min(...scores) : 0,
      averageScore,
      passPercentage: pct(attempts.filter((attempt) => attempt.passed).length, attempts.length),
      failPercentage: pct(attempts.filter((attempt) => !attempt.passed).length, attempts.length)
    },
    quizAnalytics: {
      totalQuizzesConducted: quizzes.length,
      totalAttempts: attempts.length,
      averageScore,
      bestPerformingClass: classQuizStats.sort((a, b) => b.averageScore - a.averageScore)[0]?.className || "",
      weakestPerformingClass: classQuizStats.sort((a, b) => a.averageScore - b.averageScore)[0]?.className || ""
    },
    teacherPerformance,
    materialsUtilized: {
      materialsShared: materials.length,
      videosUsed: materialCounts.video || 0,
      worksheetsShared: materialCounts.worksheet || 0,
      pdfsShared: materialCounts.pdf || 0,
      lessonResourcesUsed: materialsUtilized.length,
      rows: materialsUtilized.map((material) => ({ title: material.title, type: material.type, createdAt: material.createdAt }))
    },
    achievements
  };
  report.actionItems = actionItems(report);

  res.json(report);
});

module.exports = router;
