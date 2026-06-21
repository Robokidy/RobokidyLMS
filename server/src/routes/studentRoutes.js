const express = require("express");
const https = require("https");
const { auth, requireRole } = require("../middleware/auth");
const User = require("../models/User");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Material = require("../models/Material");
const MaterialAnalytics = require("../models/MaterialAnalytics");
const Quiz = require("../models/Quiz");
const StudentProgress = require("../models/StudentProgress");
const ActivityLog = require("../models/ActivityLog");
const Attendance = require("../models/Attendance");
const TestAttempt = require("../models/TestAttempt");
const Question = require("../models/Question");
const { ensureBaseCourses } = require("../utils/courses");
const FeeAccount = require("../models/FeeAccount");
const { ensureFeeForStudentId, serializeFeeAccount } = require("../utils/feeManager");

const router = express.Router();
router.use(auth, requireRole("student"));

async function getAssignedCourseIds(userId) {
  const user = await User.findById(userId).select("assignedCourses").lean();
  return (user?.assignedCourses || []).map((id) => String(id));
}

async function getStudentAccess(userId) {
  const user = await User.findById(userId)
    .select("username schoolId classSectionIds grade assignedCourses assignedTrackIds")
    .populate("assignedCourses", "name slug active")
    .populate("assignedTrackIds", "trackName trackCode category grade")
    .lean();

  const assignedCourses = (user?.assignedCourses || []).filter((course) => course?.active).map((course) => ({
    _id: String(course._id),
    name: course.name,
    slug: course.slug
  }));

  return {
    userId: String(user?._id || userId),
    username: user?.username || "",
    schoolId: user?.schoolId ? String(user.schoolId) : "",
    classSectionIds: (user?.classSectionIds || []).map(String),
    grade: user?.grade || "",
    assignedCourses,
    assignedTracks: (user?.assignedTrackIds || []).map((track) => ({
      _id: String(track._id),
      trackName: track.trackName,
      trackCode: track.trackCode,
      category: track.category,
      grade: track.grade
    }))
  };
}

async function getStudentProfile(userId) {
  const user = await User.findById(userId)
    .select("username fullName schoolId classSectionIds grade")
    .populate({
      path: "classSectionIds",
      select: "name grade section teacherIds classTeacherId",
      populate: [
        { path: "teacherIds", select: "username fullName" },
        { path: "classTeacherId", select: "username fullName" }
      ]
    })
    .lean();

  const classes = user?.classSectionIds || [];
  const teacherMap = new Map();
  classes.forEach((klass) => {
    if (klass.classTeacherId) {
      teacherMap.set(String(klass.classTeacherId._id), klass.classTeacherId.fullName || klass.classTeacherId.username);
    }
    (klass.teacherIds || []).forEach((teacher) => {
      teacherMap.set(String(teacher._id), teacher.fullName || teacher.username);
    });
  });

  return {
    name: user?.fullName || user?.username || "",
    grade: user?.grade || classes[0]?.grade || "",
    className: classes.map((klass) => klass.name || [klass.grade, klass.section].filter(Boolean).join(" - ")).filter(Boolean).join(", "),
    teacherNames: Array.from(teacherMap.values()).filter(Boolean)
  };
}

function studentMaterialFilter(access, id) {
  const courseIds = access.assignedCourses.map((course) => course._id);
  const assignmentOr = [
    { courseId: { $in: courseIds } },
    { assignments: { $elemMatch: { type: "course", refId: { $in: courseIds } } } },
    { assignments: { $elemMatch: { type: "student", refId: access.userId } } }
  ];
  if (access.schoolId) {
    assignmentOr.push({ schoolId: access.schoolId });
    assignmentOr.push({ assignments: { $elemMatch: { type: "school", refId: access.schoolId } } });
  }
  if (access.classSectionIds.length) {
    assignmentOr.push({ classSectionIds: { $in: access.classSectionIds } });
    assignmentOr.push({ assignments: { $elemMatch: { type: "class", refId: { $in: access.classSectionIds } } } });
  }
  if (access.grade) {
    assignmentOr.push({ grade: access.grade });
    assignmentOr.push({ assignments: { $elemMatch: { type: "grade", label: access.grade } } });
  }

  return {
    ...(id ? { _id: id } : {}),
    active: true,
    status: "published",
    isPublished: true,
    visibility: { $in: ["students", "public"] },
    $or: assignmentOr
  };
}

function proxyCloudinaryFile(res, material) {
  const sourceUrl = material.cloudinarySecureUrl;
  if (!sourceUrl) {
    res.status(404).json({ message: "Material file not found" });
    return;
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    res.status(404).json({ message: "Material file not found" });
    return;
  }
  if (parsedUrl.protocol !== "https:") {
    res.status(403).json({ message: "Only secure material URLs are allowed" });
    return;
  }

  https.get(parsedUrl, (cloudRes) => {
    if (cloudRes.statusCode >= 300 && cloudRes.statusCode < 400 && cloudRes.headers.location) {
      https.get(cloudRes.headers.location, (redirectRes) => redirectRes.pipe(res)).on("error", () => {
        res.status(502).json({ message: "Unable to open material file" });
      });
      return;
    }
    if (cloudRes.statusCode !== 200) {
      res.status(404).json({ message: "Material file not found" });
      cloudRes.resume();
      return;
    }
    res.setHeader("Content-Type", material.mimeType || cloudRes.headers["content-type"] || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(material.originalName || "material")}"`);
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("X-Content-Type-Options", "nosniff");
    cloudRes.pipe(res);
  }).on("error", () => {
    res.status(502).json({ message: "Unable to open material file" });
  });
}

async function hasPythonCourse(userId) {
  const pythonCourse = await Course.findOne({ slug: "python", active: true }).select("_id").lean();
  if (!pythonCourse) return false;
  const assignedCourses = await getAssignedCourseIds(userId);
  return assignedCourses.includes(String(pythonCourse._id));
}

async function canAccessLesson(userId, lessonId) {
  const assignedCourses = await getAssignedCourseIds(userId);
  if (!assignedCourses.length) return false;

  const lesson = await Lesson.findOne({ _id: lessonId, courseId: { $in: assignedCourses } }).select("_id").lean();
  return Boolean(lesson);
}

router.get("/dashboard", async (req, res) => {
  await ensureBaseCourses();
  const assignedCourses = await getAssignedCourseIds(req.user.id);
  const [totalLessons, progress, attempts, feeAccount, attendanceAgg, assessmentAttempts] = await Promise.all([
    assignedCourses.length ? Lesson.countDocuments({ courseId: { $in: assignedCourses } }) : 0,
    StudentProgress.findOne({ userId: req.user.id }),
    StudentProgress.aggregate([
      { $match: { userId: req.user.id } },
      { $unwind: { path: "$quizAttempts", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: "$quizAttempts.attempts" } } }
    ]),
    FeeAccount.findOne({ studentId: req.user.id }).lean(),
    Attendance.aggregate([{ $match: { studentId: req.user.id } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    TestAttempt.find({ studentId: req.user.id })
      .populate("testId", "title testType totalMarks passingMarks")
      .populate("classId", "name grade section")
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()
  ]);
  const fee = feeAccount || await ensureFeeForStudentId(req.user.id);
  const attendanceTotal = attendanceAgg.reduce((sum, row) => sum + row.count, 0);
  const presentCount = attendanceAgg.find((row) => row._id === "present")?.count || 0;
  const assessmentRows = assessmentAttempts.map((attempt) => ({
    _id: attempt._id,
    testId: attempt.testId?._id,
    title: attempt.testId?.title || "Assessment",
    type: attempt.testId?.testType || "test",
    className: attempt.classId?.name || "",
    score: attempt.totalMarksObtained || 0,
    total: attempt.totalMarks || 0,
    percentage: Math.round(attempt.percentage || 0),
    passed: attempt.passed,
    status: attempt.status,
    submittedAt: attempt.endTime || attempt.updatedAt,
    violations: attempt.violationCount || 0
  }));
  const completedAssessments = assessmentRows.filter((row) => ["submitted", "evaluated"].includes(row.status));
  const assessmentAverage = completedAssessments.length
    ? Math.round(completedAssessments.reduce((sum, row) => sum + row.percentage, 0) / completedAssessments.length)
    : 0;

  const [hasPythonAccess, studentAccess, studentProfile] = await Promise.all([
    hasPythonCourse(req.user.id),
    getStudentAccess(req.user.id),
    getStudentProfile(req.user.id)
  ]);
  const enabledModules = ["dashboard", "lessons", "materials", "quiz", "tests", "certificates", ...(hasPythonAccess ? ["codelab"] : [])];
  const allowedRoutes = ["/student/dashboard", "/student/lessons", "/student/materials", "/student/quizzes", "/student/tests", "/student/certificates", ...(hasPythonAccess ? ["/student/code"] : [])];

  res.json({
    totalLessons,
    completedLessons: progress?.completedLessons?.length || 0,
    quizAttempts: attempts[0]?.total || 0,
    codeRunCount: progress?.codeRunCount || 0,
    hasPythonAccess,
    studentProfile,
    assignedTracks: studentAccess.assignedTracks,
    assignedCourses: studentAccess.assignedCourses,
    feeAccount: serializeFeeAccount(fee),
    attendance: {
      total: attendanceTotal,
      present: presentCount,
      absent: attendanceAgg.find((row) => row._id === "absent")?.count || 0,
      late: attendanceAgg.find((row) => row._id === "late")?.count || 0,
      percentage: attendanceTotal ? Math.round((presentCount / attendanceTotal) * 100) : 0
    },
    assessmentReports: {
      attempts: assessmentRows.length,
      averageScore: assessmentAverage,
      passed: assessmentRows.filter((row) => row.passed).length,
      rows: assessmentRows
    },
    enabledModules,
    allowedRoutes
  });
});

router.get("/lessons", async (req, res) => {
  await ensureBaseCourses();
  const assignedCourses = await getAssignedCourseIds(req.user.id);
  if (!assignedCourses.length) return res.json([]);

  const lessons = await Lesson.find({ courseId: { $in: assignedCourses } }).populate("courseId", "name slug").sort({ createdAt: 1 }).lean();
  const lessonIds = lessons.map((lesson) => lesson._id);
  const [quizzes, lessonQuestions, progress] = await Promise.all([
    Quiz.find({ lessonId: { $in: lessonIds }, active: { $ne: false } }).select("lessonId questions status isPublished").lean(),
    Question.aggregate([
      { $match: { lessonId: { $in: lessonIds }, active: { $ne: false } } },
      { $group: { _id: "$lessonId", count: { $sum: 1 } } }
    ]),
    StudentProgress.findOne({ userId: req.user.id }).select("quizAttempts").lean()
  ]);
  const quizByLesson = new Map(quizzes.map((quiz) => [String(quiz.lessonId), quiz]));
  const bankQuestionCountByLesson = new Map(lessonQuestions.map((row) => [String(row._id), row.count]));
  const attemptByLesson = new Map((progress?.quizAttempts || []).map((attempt) => [String(attempt.lessonId), attempt]));

  res.json(lessons.map((lesson) => {
    const lessonId = String(lesson._id);
    const quiz = quizByLesson.get(lessonId);
    const questionCount = quiz?.questions?.length || bankQuestionCountByLesson.get(lessonId) || 0;
    const attempt = attemptByLesson.get(lessonId);
    return {
      ...lesson,
      quizAvailable: questionCount > 0,
      quizQuestionCount: questionCount,
      quizAttempted: Boolean(attempt?.attempts),
      quizScore: attempt?.lastAttemptScore || 0
    };
  }));
});

router.get("/lessons/:id", async (req, res) => {
  const assignedCourses = await getAssignedCourseIds(req.user.id);
  if (!assignedCourses.length) return res.status(403).json({ message: "No courses assigned" });

  const lesson = await Lesson.findOne({ _id: req.params.id, courseId: { $in: assignedCourses } })
    .populate("courseId", "name slug")
    .lean();
  if (!lesson) return res.status(404).json({ message: "Lesson not found or not assigned" });
  res.json(lesson);
});

router.get("/materials", async (req, res) => {
  const access = await getStudentAccess(req.user.id);
  const materials = await Material.find(studentMaterialFilter(access))
    .select("title description courseId type originalName mimeType size language active status thumbnailUrl createdAt")
    .populate("courseId", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  res.json(materials);
});

router.get("/materials/:id", async (req, res) => {
  const access = await getStudentAccess(req.user.id);
  const material = await Material.findOne(studentMaterialFilter(access, req.params.id))
    .select("title description courseId type originalName mimeType size language active status createdAt")
    .populate("courseId", "name slug")
    .lean();

  if (!material) return res.status(404).json({ message: "Material not found or not assigned" });

  const progress = await StudentProgress.findOneAndUpdate(
    { userId: req.user.id },
    { $setOnInsert: { userId: req.user.id } },
    { upsert: true, new: true }
  );
  const existing = progress.materialViews.find((view) => String(view.materialId) === String(material._id));
  if (existing) {
    existing.viewCount += 1;
    existing.lastViewedAt = new Date();
  } else {
    progress.materialViews.push({ materialId: material._id, viewCount: 1, lastViewedAt: new Date() });
  }
  await progress.save();
  await Promise.all([
    Material.updateOne(
      { _id: material._id },
      {
        $inc: { viewCount: 1 },
        $addToSet: { uniqueViewers: req.user.id },
        $set: { lastViewedAt: new Date() }
      }
    ),
    MaterialAnalytics.findOneAndUpdate(
      { materialId: material._id, studentId: req.user.id },
      {
        $set: {
          viewedAt: new Date(),
          schoolId: access.schoolId || undefined,
          classSectionId: access.classSectionIds[0] || undefined
        },
        $inc: { sessionCount: 1 }
      },
      { upsert: true, new: true }
    ),
    ActivityLog.create({ userId: req.user.id, action: "material_viewed", meta: { materialId: material._id, title: material.title } })
  ]);

  res.json({
    ...material,
    fileUrl: `/api/student/materials/${material._id}/file`,
    viewer: {
      disableDownload: true,
      disablePrint: true,
      disableCopy: true,
      watermark: `${access.username} | ${new Date().toISOString()}`
    }
  });
});

router.get("/materials/:id/file", async (req, res) => {
  const access = await getStudentAccess(req.user.id);
  const material = await Material.findOne(studentMaterialFilter(access, req.params.id)).lean();
  if (!material) return res.status(404).json({ message: "Material file not found" });
  proxyCloudinaryFile(res, material);
});

router.post("/lessons/:id/complete", async (req, res) => {
  if (!(await canAccessLesson(req.user.id, req.params.id))) {
    return res.status(403).json({ message: "This lesson is not assigned to you" });
  }

  const progress = await StudentProgress.findOneAndUpdate(
    { userId: req.user.id },
    { $addToSet: { completedLessons: req.params.id } },
    { upsert: true, new: true }
  );
  await ActivityLog.create({ userId: req.user.id, action: "lesson_completed", meta: { lessonId: req.params.id } });
  res.json(progress);
});

router.get("/quizzes/:lessonId", async (req, res) => {
  if (!(await canAccessLesson(req.user.id, req.params.lessonId))) {
    return res.status(403).json({ message: "This quiz is not assigned to you" });
  }

  const progress = await StudentProgress.findOne({ userId: req.user.id }).select("quizAttempts").lean();
  const existingAttempt = (progress?.quizAttempts || []).find((q) => String(q.lessonId) === String(req.params.lessonId));
  const quiz = await Quiz.findOne({ lessonId: req.params.lessonId, active: { $ne: false } }).lean();
  if (quiz?.questions?.length) {
    return res.json({
      ...quiz,
      alreadyAttempted: Boolean(existingAttempt?.attempts),
      attempt: existingAttempt || null
    });
  }

  const bankQuestions = await Question.find({ lessonId: req.params.lessonId, active: { $ne: false } })
    .select("questionText type options marks difficulty")
    .sort({ createdAt: 1 })
    .lean();
  if (!bankQuestions.length) return res.json(null);

  res.json({
    _id: `bank-${req.params.lessonId}`,
    lessonId: req.params.lessonId,
    title: "Lesson Quiz",
    questions: bankQuestions
      .filter((question) => ["mcq", "true-false"].includes(question.type))
      .map((question) => {
        const options = question.options || [];
        const correctIndex = options.findIndex((option) => option.isCorrect);
        return {
          question: question.questionText,
          options: options.map((option) => option.text),
          correctAnswer: correctIndex >= 0 ? correctIndex : 0,
          points: question.marks || 1,
          difficulty: question.difficulty
        };
      }),
    alreadyAttempted: Boolean(existingAttempt?.attempts),
    attempt: existingAttempt || null
  });
});

router.post("/quizzes/:lessonId/submit", async (req, res) => {
  if (!(await canAccessLesson(req.user.id, req.params.lessonId))) {
    return res.status(403).json({ message: "This quiz is not assigned to you" });
  }

  const quiz = await Quiz.findOne({ lessonId: req.params.lessonId });
  let questions = quiz?.questions || [];
  if (!questions.length) {
    const bankQuestions = await Question.find({ lessonId: req.params.lessonId, active: { $ne: false } }).select("questionText type options marks difficulty").sort({ createdAt: 1 }).lean();
    questions = bankQuestions
      .filter((question) => ["mcq", "true-false"].includes(question.type))
      .map((question) => {
        const options = question.options || [];
        return {
          question: question.questionText,
          options: options.map((option) => option.text),
          correctAnswer: Math.max(0, options.findIndex((option) => option.isCorrect)),
          points: question.marks || 1,
          difficulty: question.difficulty
        };
      });
  }
  if (!questions.length) return res.status(404).json({ message: "Quiz not found" });

  const { answers = [] } = req.body;

  const progress = await StudentProgress.findOneAndUpdate(
    { userId: req.user.id },
    { $setOnInsert: { userId: req.user.id } },
    { upsert: true, new: true }
  );

  const existing = progress.quizAttempts.find((q) => String(q.lessonId) === req.params.lessonId);
  if (existing?.attempts > 0) {
    return res.status(409).json({ message: "You have already attempted this quiz once" });
  }

  const correct = questions.reduce((acc, q, idx) => acc + (q.correctAnswer === answers[idx] ? 1 : 0), 0);
  const score = Math.round((correct / questions.length) * 100);
  if (existing) {
    existing.attempts = 1;
    existing.lastAttemptScore = score;
    existing.bestScore = Math.max(existing.bestScore, score);
  } else {
    progress.quizAttempts.push({ lessonId: req.params.lessonId, attempts: 1, lastAttemptScore: score, bestScore: score });
  }

  // Mark lesson as completed only when the student gets all answers correct.
  if (score === 100) {
    const alreadyCompleted = progress.completedLessons.some((id) => String(id) === String(req.params.lessonId));
    if (!alreadyCompleted) {
      progress.completedLessons.push(req.params.lessonId);
    }
  }

  await progress.save();
  await ActivityLog.create({ userId: req.user.id, action: "quiz_submitted", meta: { lessonId: req.params.lessonId, score } });

  if (quiz) {
    await Quiz.updateOne({ _id: quiz._id }, { $inc: { totalAttempts: 1 } });
  }

  res.json({ score, total: questions.length, correct });
});

router.get("/progress", async (req, res) => {
  const progress = await StudentProgress.findOne({ userId: req.user.id });
  res.json(progress || { completedLessons: [], quizAttempts: [], codeRunCount: 0 });
});

module.exports = router;
