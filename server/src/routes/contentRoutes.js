const express = require("express");
const { auth, loadUser } = require("../middleware/auth");
const User = require("../models/User");
const Lesson = require("../models/Lesson");
const Material = require("../models/Material");
const Quiz = require("../models/Quiz");
const Assignment = require("../models/Assignment");
const School = require("../models/School");
const ClassSection = require("../models/ClassSection");

const router = express.Router();
router.use(auth, loadUser);

/**
 * Utility: Get user scope (what they can access)
 */
function getUserScope(user) {
  const scope = {
    userId: user._id,
    role: user.role,
    schoolId: user.schoolId,
    classSectionIds: user.classSectionIds ? user.classSectionIds.map(id => String(id)) : [],
    permissions: user.permissions || []
  };
  return scope;
}

/**
 * Utility: Build query filter based on user role and permissions
 */
function buildAccessFilter(scope, baseFilter = {}) {
  const filter = { ...baseFilter, active: true };

  if (scope.role === "admin") {
    // Admin sees everything
    return filter;
  }

  if (scope.role === "teacher") {
    // Teachers see content in their school and assigned classes
    filter.schoolId = scope.schoolId;
    filter.$or = [
      { classSectionIds: { $in: scope.classSectionIds } },
      { classSectionIds: { $size: 0 } }, // School-level content
      { createdBy: scope.userId } // Their own content
    ];
    return filter;
  }

  if (scope.role === "student") {
    // Students see published content assigned to their class
    filter.isPublished = true;
    filter.classSectionIds = scope.classSectionIds.length > 0 ? { $in: scope.classSectionIds } : { $size: 0 };
    return filter;
  }

  return filter;
}

/**
 * Authorization check
 */
function canModify(scope, createdById) {
  if (scope.role === "admin") return true;
  if (scope.role === "teacher") return String(createdById) === String(scope.userId);
  return false;
}

// ============================================================================
// LESSONS API
// ============================================================================

/**
 * GET /api/content/lessons
 * Get lessons based on user role and permissions
 */
router.get("/lessons", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const { courseId, search, page = 1, limit = 20, status } = req.query;

    let filter = buildAccessFilter(scope);

    if (courseId) filter.courseId = courseId;
    if (status && (scope.role === "admin" || scope.role === "teacher")) {
      filter.status = status;
    } else {
      filter.isPublished = true;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [lessons, total] = await Promise.all([
      Lesson.find(filter)
        .populate("createdBy", "fullName email")
        .populate("courseId", "name")
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Lesson.countDocuments(filter)
    ]);

    res.json({
      data: lessons,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ message: "Failed to fetch lessons", error: error.message });
  }
});

/**
 * GET /api/content/lessons/:id
 * Get single lesson
 */
router.get("/lessons/:id", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const lesson = await Lesson.findById(req.params.id)
      .populate("createdBy", "fullName email")
      .populate("courseId")
      .populate("quizzes")
      .populate("assignments")
      .populate("relatedMaterials");

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    // Check access
    const filter = buildAccessFilter(scope, { _id: lesson._id });
    const hasAccess = await Lesson.findOne(filter);

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(lesson);
  } catch (error) {
    console.error("Error fetching lesson:", error);
    res.status(500).json({ message: "Failed to fetch lesson", error: error.message });
  }
});

/**
 * POST /api/content/lessons
 * Create new lesson
 */
router.post("/lessons", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);

    // Only admin and teacher can create
    if (!["admin", "teacher"].includes(scope.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const {
      title,
      description,
      content,
      contentMarkdown,
      courseId,
      courseTrackId,
      objectives,
      keyPoints,
      duration,
      difficulty,
      tags,
      visibility,
      classSectionIds
    } = req.body;

    if (!title || !content || !courseId) {
      return res.status(400).json({ message: "Title, content, and courseId are required" });
    }

    // Teachers can only create in their school
    const finalSchoolId = scope.role === "admin" ? req.body.schoolId : scope.schoolId;
    const finalClassSectionIds = scope.role === "admin" 
      ? (classSectionIds || []) 
      : classSectionIds ? classSectionIds.filter(id => scope.classSectionIds.includes(String(id))) : [];

    const lesson = new Lesson({
      title: title.trim(),
      description,
      content,
      contentMarkdown,
      courseId,
      courseTrackId,
      objectives: objectives || [],
      keyPoints: keyPoints || [],
      duration,
      difficulty,
      tags: tags || [],
      visibility: visibility || "teachers",
      schoolId: finalSchoolId,
      classSectionIds: finalClassSectionIds,
      status: "draft",
      createdBy: scope.userId
    });

    await lesson.save();
    await lesson.populate("createdBy", "fullName email");

    res.status(201).json(lesson);
  } catch (error) {
    console.error("Error creating lesson:", error);
    res.status(500).json({ message: "Failed to create lesson", error: error.message });
  }
});

/**
 * PUT /api/content/lessons/:id
 * Update lesson
 */
router.put("/lessons/:id", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    if (!canModify(scope, lesson.createdBy)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      title,
      description,
      content,
      contentMarkdown,
      courseId,
      courseTrackId,
      objectives,
      keyPoints,
      duration,
      difficulty,
      tags,
      visibility,
      classSectionIds,
      status,
      isPublished
    } = req.body;

    if (title) lesson.title = title.trim();
    if (description !== undefined) lesson.description = description;
    if (content) lesson.content = content;
    if (contentMarkdown) lesson.contentMarkdown = contentMarkdown;
    if (courseId) lesson.courseId = courseId;
    if (courseTrackId) lesson.courseTrackId = courseTrackId;
    if (objectives) lesson.objectives = objectives;
    if (keyPoints) lesson.keyPoints = keyPoints;
    if (duration) lesson.duration = duration;
    if (difficulty) lesson.difficulty = difficulty;
    if (tags) lesson.tags = tags;
    if (visibility) lesson.visibility = visibility;
    if (classSectionIds) lesson.classSectionIds = classSectionIds;
    if (status) lesson.status = status;
    if (isPublished !== undefined) {
      lesson.isPublished = isPublished;
      if (isPublished && !lesson.publishedDate) {
        lesson.publishedDate = new Date();
      }
    }

    lesson.updatedBy = scope.userId;
    await lesson.save();
    await lesson.populate("createdBy", "fullName email");

    res.json(lesson);
  } catch (error) {
    console.error("Error updating lesson:", error);
    res.status(500).json({ message: "Failed to update lesson", error: error.message });
  }
});

/**
 * DELETE /api/content/lessons/:id
 * Delete lesson
 */
router.delete("/lessons/:id", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    if (!canModify(scope, lesson.createdBy)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (scope.role === "admin") {
      // Admin can hard delete
      await Lesson.deleteOne({ _id: req.params.id });
    } else {
      // Teachers soft delete
      lesson.active = false;
      await lesson.save();
    }

    res.json({ message: "Lesson deleted" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    res.status(500).json({ message: "Failed to delete lesson", error: error.message });
  }
});

/**
 * POST /api/content/lessons/reorder
 * Reorder lessons (drag & drop)
 */
router.post("/lessons/reorder", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const { lessonIds } = req.body;

    if (!Array.isArray(lessonIds)) {
      return res.status(400).json({ message: "lessonIds must be an array" });
    }

    // Verify all lessons belong to user
    const lessons = await Lesson.find({ _id: { $in: lessonIds } });

    for (const lesson of lessons) {
      if (!canModify(scope, lesson.createdBy)) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Update order
    await Promise.all(
      lessonIds.map((id, index) => 
        Lesson.updateOne({ _id: id }, { order: index })
      )
    );

    res.json({ message: "Lessons reordered" });
  } catch (error) {
    console.error("Error reordering lessons:", error);
    res.status(500).json({ message: "Failed to reorder lessons", error: error.message });
  }
});

// ============================================================================
// MATERIALS API
// ============================================================================

/**
 * GET /api/content/materials
 * Get materials based on user role
 */
router.get("/materials", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const { courseId, type, search, page = 1, limit = 20 } = req.query;

    let filter = buildAccessFilter(scope);

    if (courseId) filter.courseId = courseId;
    if (type) filter.type = type;

    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [materials, total] = await Promise.all([
      Material.find(filter)
        .populate("createdBy", "fullName email")
        .populate("courseId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Material.countDocuments(filter)
    ]);

    res.json({
      data: materials,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({ message: "Failed to fetch materials", error: error.message });
  }
});

/**
 * GET /api/content/materials/:id
 * Get single material
 */
router.get("/materials/:id", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const material = await Material.findById(req.params.id)
      .populate("createdBy", "fullName email")
      .populate("courseId");

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    // Check access
    const filter = buildAccessFilter(scope, { _id: material._id });
    const hasAccess = await Material.findOne(filter);

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Increment view count
    material.viewCount = (material.viewCount || 0) + 1;
    await material.save();

    res.json(material);
  } catch (error) {
    console.error("Error fetching material:", error);
    res.status(500).json({ message: "Failed to fetch material", error: error.message });
  }
});

/**
 * POST /api/content/materials
 * Create material (with file upload)
 */
router.post("/materials", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);

    if (!["admin", "teacher"].includes(scope.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const {
      title,
      description,
      courseId,
      lessonId,
      type,
      fileName,
      originalName,
      filePath,
      mimeType,
      size,
      tags,
      visibility,
      classSectionIds
    } = req.body;

    if (!title || !courseId || !type || !fileName || !filePath) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const finalSchoolId = scope.role === "admin" ? req.body.schoolId : scope.schoolId;
    const finalClassSectionIds = scope.role === "admin" 
      ? (classSectionIds || []) 
      : classSectionIds ? classSectionIds.filter(id => scope.classSectionIds.includes(String(id))) : [];

    const material = new Material({
      title: title.trim(),
      description,
      courseId,
      lessonId,
      type,
      fileName,
      originalName,
      filePath,
      mimeType,
      size,
      tags: tags || [],
      visibility: visibility || "teachers",
      schoolId: finalSchoolId,
      classSectionIds: finalClassSectionIds,
      isPublished: req.body.isPublished || false,
      createdBy: scope.userId
    });

    await material.save();
    await material.populate("createdBy", "fullName email");

    res.status(201).json(material);
  } catch (error) {
    console.error("Error creating material:", error);
    res.status(500).json({ message: "Failed to create material", error: error.message });
  }
});

/**
 * PUT /api/content/materials/:id
 * Update material
 */
router.put("/materials/:id", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    if (!canModify(scope, material.createdBy)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      title,
      description,
      tags,
      visibility,
      isPublished,
      classSectionIds
    } = req.body;

    if (title) material.title = title.trim();
    if (description !== undefined) material.description = description;
    if (tags) material.tags = tags;
    if (visibility) material.visibility = visibility;
    if (isPublished !== undefined) {
      material.isPublished = isPublished;
      if (isPublished && !material.publishedDate) {
        material.publishedDate = new Date();
      }
    }
    if (classSectionIds) material.classSectionIds = classSectionIds;

    material.updatedBy = scope.userId;
    await material.save();
    await material.populate("createdBy", "fullName email");

    res.json(material);
  } catch (error) {
    console.error("Error updating material:", error);
    res.status(500).json({ message: "Failed to update material", error: error.message });
  }
});

/**
 * DELETE /api/content/materials/:id
 * Delete material
 */
router.delete("/materials/:id", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    if (!canModify(scope, material.createdBy)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (scope.role === "admin") {
      await Material.deleteOne({ _id: req.params.id });
    } else {
      material.active = false;
      await material.save();
    }

    res.json({ message: "Material deleted" });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({ message: "Failed to delete material", error: error.message });
  }
});

// ============================================================================
// QUIZZES API
// ============================================================================

/**
 * GET /api/content/quizzes
 * Get quizzes
 */
router.get("/quizzes", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const { lessonId, courseId, page = 1, limit = 20 } = req.query;

    let filter = buildAccessFilter(scope);

    if (lessonId) filter.lessonId = lessonId;
    if (courseId) filter.courseId = courseId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [quizzes, total] = await Promise.all([
      Quiz.find(filter)
        .populate("createdBy", "fullName email")
        .populate("lessonId", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Quiz.countDocuments(filter)
    ]);

    res.json({
      data: quizzes,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({ message: "Failed to fetch quizzes", error: error.message });
  }
});

/**
 * GET /api/content/quizzes/:id
 */
router.get("/quizzes/:id", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const quiz = await Quiz.findById(req.params.id)
      .populate("createdBy", "fullName email")
      .populate("lessonId");

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const filter = buildAccessFilter(scope, { _id: quiz._id });
    const hasAccess = await Quiz.findOne(filter);

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(quiz);
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ message: "Failed to fetch quiz", error: error.message });
  }
});

/**
 * POST /api/content/quizzes
 * Create quiz
 */
router.post("/quizzes", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);

    if (!["admin", "teacher"].includes(scope.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const { title, description, lessonId, courseId, questions, maxAttempts, timeLimit, visibility } = req.body;

    if (!title || !lessonId || !Array.isArray(questions)) {
      return res.status(400).json({ message: "Title, lessonId, and questions are required" });
    }

    const quiz = new Quiz({
      title: title.trim(),
      description,
      lessonId,
      courseId,
      questions,
      maxAttempts: maxAttempts || 1,
      timeLimit,
      visibility: visibility || "teachers",
      schoolId: scope.schoolId,
      createdBy: scope.userId
    });

    await quiz.save();
    await quiz.populate("createdBy", "fullName email");

    res.status(201).json(quiz);
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ message: "Failed to create quiz", error: error.message });
  }
});

/**
 * PUT /api/content/quizzes/:id
 */
router.put("/quizzes/:id", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (!canModify(scope, quiz.createdBy)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description, questions, maxAttempts, timeLimit, visibility, status, isPublished } = req.body;

    if (title) quiz.title = title.trim();
    if (description !== undefined) quiz.description = description;
    if (questions) quiz.questions = questions;
    if (maxAttempts) quiz.maxAttempts = maxAttempts;
    if (timeLimit) quiz.timeLimit = timeLimit;
    if (visibility) quiz.visibility = visibility;
    if (status) quiz.status = status;
    if (isPublished !== undefined) {
      quiz.isPublished = isPublished;
      if (isPublished && !quiz.publishedDate) {
        quiz.publishedDate = new Date();
      }
    }

    quiz.updatedBy = scope.userId;
    await quiz.save();
    await quiz.populate("createdBy", "fullName email");

    res.json(quiz);
  } catch (error) {
    console.error("Error updating quiz:", error);
    res.status(500).json({ message: "Failed to update quiz", error: error.message });
  }
});

/**
 * DELETE /api/content/quizzes/:id
 */
router.delete("/quizzes/:id", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (!canModify(scope, quiz.createdBy)) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Quiz.deleteOne({ _id: req.params.id });
    res.json({ message: "Quiz deleted" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ message: "Failed to delete quiz", error: error.message });
  }
});

// ============================================================================
// ASSIGNMENTS API
// ============================================================================

/**
 * GET /api/content/assignments
 */
router.get("/assignments", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const { courseId, page = 1, limit = 20 } = req.query;

    let filter = buildAccessFilter(scope);

    if (courseId) filter.courseId = courseId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [assignments, total] = await Promise.all([
      Assignment.find(filter)
        .populate("createdBy", "fullName email")
        .populate("courseId", "name")
        .sort({ dueDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Assignment.countDocuments(filter)
    ]);

    res.json({
      data: assignments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ message: "Failed to fetch assignments", error: error.message });
  }
});

/**
 * GET /api/content/assignments/:id
 */
router.get("/assignments/:id", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const assignment = await Assignment.findById(req.params.id)
      .populate("createdBy", "fullName email")
      .populate("courseId");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const filter = buildAccessFilter(scope, { _id: assignment._id });
    const hasAccess = await Assignment.findOne(filter);

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(assignment);
  } catch (error) {
    console.error("Error fetching assignment:", error);
    res.status(500).json({ message: "Failed to fetch assignment", error: error.message });
  }
});

/**
 * POST /api/content/assignments
 */
router.post("/assignments", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);

    if (!["admin", "teacher"].includes(scope.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const {
      title,
      description,
      instructions,
      courseId,
      lessonId,
      dueDate,
      maxMarks,
      classSectionIds,
      type,
      allowLateSubmission,
      allowResubmission
    } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: "Title and dueDate are required" });
    }

    const finalSchoolId = scope.role === "admin" ? req.body.schoolId : scope.schoolId;
    const finalClassSectionIds = scope.role === "admin" 
      ? (classSectionIds || []) 
      : classSectionIds ? classSectionIds.filter(id => scope.classSectionIds.includes(String(id))) : [];

    const assignment = new Assignment({
      title: title.trim(),
      description,
      instructions,
      courseId,
      lessonId,
      dueDate,
      maxMarks: maxMarks || 100,
      type: type || "submission",
      classSectionIds: finalClassSectionIds,
      schoolId: finalSchoolId,
      allowLateSubmission: allowLateSubmission || false,
      allowResubmission: allowResubmission || false,
      createdBy: scope.userId
    });

    await assignment.save();
    await assignment.populate("createdBy", "fullName email");

    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    res.status(500).json({ message: "Failed to create assignment", error: error.message });
  }
});

/**
 * PUT /api/content/assignments/:id
 */
router.put("/assignments/:id", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (!canModify(scope, assignment.createdBy)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description, instructions, dueDate, maxMarks, status, isPublished } = req.body;

    if (title) assignment.title = title.trim();
    if (description !== undefined) assignment.description = description;
    if (instructions !== undefined) assignment.instructions = instructions;
    if (dueDate) assignment.dueDate = dueDate;
    if (maxMarks) assignment.maxMarks = maxMarks;
    if (status) assignment.status = status;
    if (isPublished !== undefined) {
      assignment.isPublished = isPublished;
      if (isPublished && !assignment.publishedDate) {
        assignment.publishedDate = new Date();
      }
    }

    assignment.updatedBy = scope.userId;
    await assignment.save();
    await assignment.populate("createdBy", "fullName email");

    res.json(assignment);
  } catch (error) {
    console.error("Error updating assignment:", error);
    res.status(500).json({ message: "Failed to update assignment", error: error.message });
  }
});

/**
 * DELETE /api/content/assignments/:id
 */
router.delete("/assignments/:id", async (req, res) => {
  try {
    const scope = getUserScope(req.authUser || req.user);
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (!canModify(scope, assignment.createdBy)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (scope.role === "admin") {
      await Assignment.deleteOne({ _id: req.params.id });
    } else {
      assignment.active = false;
      await assignment.save();
    }

    res.json({ message: "Assignment deleted" });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    res.status(500).json({ message: "Failed to delete assignment", error: error.message });
  }
});

module.exports = router;
