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
  const [totalLessons, progress, attempts, feeAccount] = await Promise.all([
    assignedCourses.length ? Lesson.countDocuments({ courseId: { $in: assignedCourses } }) : 0,
    StudentProgress.findOne({ userId: req.user.id }),
    StudentProgress.aggregate([
      { $match: { userId: req.user.id } },
      { $unwind: { path: "$quizAttempts", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: "$quizAttempts.attempts" } } }
    ]),
    FeeAccount.findOne({ studentId: req.user.id }).lean()
  ]);
  const fee = feeAccount || await ensureFeeForStudentId(req.user.id);

  const hasPythonAccess = await hasPythonCourse(req.user.id);
  const studentAccess = await getStudentAccess(req.user.id);
  const enabledModules = ["lessons", "materials", "quiz", "tests", ...(hasPythonAccess ? ["codelab"] : [])];
  const allowedRoutes = ["/student/lessons", "/student/materials", "/student/quizzes", "/student/tests", ...(hasPythonAccess ? ["/student/code"] : [])];

  res.json({
    totalLessons,
    completedLessons: progress?.completedLessons?.length || 0,
    quizAttempts: attempts[0]?.total || 0,
    codeRunCount: progress?.codeRunCount || 0,
    hasPythonAccess,
    assignedTracks: studentAccess.assignedTracks,
    assignedCourses: studentAccess.assignedCourses,
    feeAccount: serializeFeeAccount(fee),
    enabledModules,
    allowedRoutes
  });
});

router.get("/lessons", async (req, res) => {
  await ensureBaseCourses();
  const assignedCourses = await getAssignedCourseIds(req.user.id);
  if (!assignedCourses.length) return res.json([]);

  const lessons = await Lesson.find({ courseId: { $in: assignedCourses } }).populate("courseId", "name slug").sort({ createdAt: 1 });
  res.json(lessons);
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

  const quiz = await Quiz.findOne({ lessonId: req.params.lessonId });
  res.json(quiz);
});

router.post("/quizzes/:lessonId/submit", async (req, res) => {
  if (!(await canAccessLesson(req.user.id, req.params.lessonId))) {
    return res.status(403).json({ message: "This quiz is not assigned to you" });
  }

  const quiz = await Quiz.findOne({ lessonId: req.params.lessonId });
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });

  const { answers = [] } = req.body;
  const correct = quiz.questions.reduce((acc, q, idx) => acc + (q.correctAnswer === answers[idx] ? 1 : 0), 0);
  const score = Math.round((correct / quiz.questions.length) * 100);

  const progress = await StudentProgress.findOneAndUpdate(
    { userId: req.user.id },
    { $setOnInsert: { userId: req.user.id } },
    { upsert: true, new: true }
  );

  const existing = progress.quizAttempts.find((q) => String(q.lessonId) === req.params.lessonId);
  if (existing) {
    existing.attempts += 1;
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

  res.json({ score, total: quiz.questions.length, correct });
});

router.get("/progress", async (req, res) => {
  const progress = await StudentProgress.findOne({ userId: req.user.id });
  res.json(progress || { completedLessons: [], quizAttempts: [], codeRunCount: 0 });
});

module.exports = router;
