/**
 * Enterprise Examination & Assessment Module - Complete Backend API Routes
 * Handles: Tests, Questions, Attempts, Anti-cheating, Reporting, Analytics
 * Roles: CEO/Admin, Teachers, Students with full RBAC
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Test = require("../models/Test");
const Question = require("../models/Question");
const TestAttempt = require("../models/TestAttempt");
const TestAssignment = require("../models/TestAssignment");
const CheatingViolation = require("../models/CheatingViolation");
const CodingSubmission = require("../models/CodingSubmission");
const TestReport = require("../models/TestReport");
const User = require("../models/User");
const ClassSection = require("../models/ClassSection");
const Course = require("../models/Course");
const { auth } = require("../middleware/auth");

// ======================= UTILITY FUNCTIONS =======================

/**
 * Evaluate answer based on question type
 */
function evaluateAnswer(answer, question) {
  if (!answer.answer && answer.answer !== 0) return null;

  switch (question.type) {
    case "mcq":
      const selectedOption = question.options?.find(
        (o) => o.optionId === answer.answer
      );
      return selectedOption?.isCorrect || false;

    case "true-false":
      return (
        (answer.answer === true && question.options?.[1]?.isCorrect) ||
        (answer.answer === false && question.options?.[0]?.isCorrect) ||
        false
      );

    case "multi-select":
      const selected = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
      const correctIds = question.options
        ?.filter((o) => o.isCorrect)
        .map((o) => o.optionId) || [];
      return (
        selected.length === correctIds.length &&
        selected.every((opt) => correctIds.includes(opt))
      );

    case "fill-blank":
      if (!question.blanks || question.blanks.length === 0) return null;
      const blank = question.blanks[0];
      const userAnswer = blank.caseSensitive
        ? answer.answer.trim()
        : answer.answer.trim().toLowerCase();
      const correctAnswer = blank.caseSensitive
        ? blank.correctAnswer
        : blank.correctAnswer.toLowerCase();

      const isExactMatch = userAnswer === correctAnswer;
      const isVariationMatch =
        blank.acceptableVariations?.some((v) =>
          blank.caseSensitive ? v === answer.answer : v.toLowerCase() === userAnswer
        ) || false;

      return isExactMatch || isVariationMatch;

    case "match-following":
      if (!question.matchingPairs || question.matchingPairs.length === 0)
        return null;
      const userMatches = answer.answer || [];
      return (
        question.matchingPairs.length ===
          userMatches.length &&
        question.matchingPairs.every((pair) => {
          const userMatch = userMatches.find((m) => m.leftId === pair.leftId);
          return userMatch?.rightId === pair.rightId;
        })
      );

    case "descriptive":
    case "image-based":
    case "coding":
      return null; // Requires manual evaluation

    default:
      return null;
  }
}

/**
 * Calculate marks for answer
 */
function calculateMarks(isCorrect, question, testNegativeMarking) {
  if (isCorrect === null) return 0; // Needs evaluation
  if (isCorrect) return question.marks || 0;
  if (isCorrect === false && testNegativeMarking?.enabled) {
    return -(testNegativeMarking.marksPerWrongAnswer || 0);
  }
  return 0;
}

/**
 * Check if student can access test
 */
async function canStudentAccessTest(studentId, testId) {
  const test = await Test.findById(testId);
  if (!test) return false;

  const now = new Date();
  if (test.startDateTime && now < test.startDateTime) return false;
  if (test.endDateTime && now > test.endDateTime) return false;

  const assignment = await TestAssignment.findOne({
    testId,
    $or: [
      { "assignedTo.students": studentId },
      { "assignedTo.schools": { $exists: true } },
    ],
  });

  return !!assignment;
}

// ======================= TEST CRUD OPERATIONS =======================

/**
 * GET /api/exams/tests
 * Get all tests (role-based filtering)
 */
router.get("/tests", auth, async (req, res) => {
  try {
    const { role, userId, schoolId } = req.user;
    let query = { status: { $ne: "archived" } };

    if (role === "teacher") {
      query.createdBy = userId;
    } else if (["admin", "cto"].includes(role)) {
      query.schoolId = schoolId;
    } else if (role === "student") {
      // Students see assigned tests only
      const assignments = await TestAssignment.find({
        $or: [
          { "assignedTo.students": userId },
          { "assignedTo.grades": req.user.grade },
        ],
      });
      query._id = { $in: assignments.map((a) => a.testId) };
    }

    const tests = await Test.find(query)
      .populate("createdBy", "fullName email")
      .populate("questions", "questionNumber questionText type marks")
      .select("-questions") // Exclude full question details from list
      .sort({ startDateTime: -1 })
      .limit(100);

    // Add attempt info for students
    if (role === "student") {
      const attempts = await TestAttempt.find({
        studentId: userId,
        testId: { $in: tests.map((t) => t._id) },
      });

      tests.forEach((test) => {
        const attempt = attempts.find((a) => a.testId.equals(test._id));
        test.studentAttempt = attempt;
      });
    }

    res.json(tests);
  } catch (error) {
    console.error("Error fetching tests:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/exams/tests/:testId
 * Get single test details with all questions
 */
router.get("/tests/:testId", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId)
      .populate("createdBy", "fullName email")
      .populate({
        path: "questions",
        select: "-codingConfig.testCases.expectedOutput", // Hide expected outputs
      });

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Authorization check
    if (req.user.role === "student") {
      const canAccess = await canStudentAccessTest(req.user.userId, req.params.testId);
      if (!canAccess) {
        return res.status(403).json({ error: "Test not assigned to you" });
      }
    }

    res.json(test);
  } catch (error) {
    console.error("Error fetching test:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/exams/tests
 * Create new test (Teacher/Admin only)
 */
router.post("/tests", auth, async (req, res) => {
  try {
    const { role, userId, schoolId } = req.user;

    if (role !== "teacher" && role !== "admin") {
      return res.status(403).json({ error: "Only teachers and admins can create tests" });
    }

    const testData = {
      ...req.body,
      createdBy: userId,
      schoolId,
      status: "draft",
    };

    const test = new Test(testData);
    await test.save();

    res.status(201).json(test);
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/exams/tests/:testId
 * Update test
 */
router.put("/tests/:testId", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Authorization: creator or admin
    if (
      test.createdBy.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Prevent updates to published tests with active attempts
    if (test.status === "published") {
      const activeAttempts = await TestAttempt.countDocuments({
        testId: req.params.testId,
        status: "in-progress",
      });
      if (activeAttempts > 0) {
        return res
          .status(400)
          .json({ error: "Cannot update test with active attempts" });
      }
    }

    Object.assign(test, req.body);
    await test.save();

    res.json(test);
  } catch (error) {
    console.error("Error updating test:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/exams/tests/:testId
 * Delete test (archive it)
 */
router.delete("/tests/:testId", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    if (
      test.createdBy.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    test.status = "archived";
    await test.save();

    res.json({ message: "Test archived successfully" });
  } catch (error) {
    console.error("Error deleting test:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/exams/tests/:testId/publish
 * Publish test to make it live
 */
router.post("/tests/:testId/publish", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    if (
      test.createdBy.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (test.questions.length === 0) {
      return res.status(400).json({ error: "Test must have at least one question" });
    }

    test.status = "published";
    test.publishedAt = new Date();
    await test.save();

    res.json({ message: "Test published successfully", test });
  } catch (error) {
    console.error("Error publishing test:", error);
    res.status(400).json({ error: error.message });
  }
});

// ======================= QUESTION MANAGEMENT =======================

/**
 * POST /api/exams/tests/:testId/questions
 * Add question to test
 */
router.post("/tests/:testId/questions", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    if (
      test.createdBy.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const questionData = {
      ...req.body,
      testId: req.params.testId,
      createdBy: req.user.userId,
    };

    const question = new Question(questionData);
    await question.save();

    test.questions.push(question._id);
    await test.save();

    res.status(201).json(question);
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/exams/questions/:questionId
 * Update question
 */
router.put("/questions/:questionId", auth, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.questionId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json(question);
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/exams/questions/:questionId
 * Delete question
 */
router.delete("/questions/:questionId", auth, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.questionId);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    await Test.findByIdAndUpdate(question.testId, {
      $pull: { questions: question._id },
    });

    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/exams/tests/:testId/questions
 * Get all questions for a test
 */
router.get("/tests/:testId/questions", auth, async (req, res) => {
  try {
    const questions = await Question.find({ testId: req.params.testId });

    res.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================= TEST ASSIGNMENT =======================

/**
 * POST /api/exams/tests/:testId/assign
 * Assign test to students/classes/schools/courses
 */
router.post("/tests/:testId/assign", auth, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "teacher" && role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Delete existing assignments for this test
    await TestAssignment.deleteMany({ testId: req.params.testId });

    const assignment = new TestAssignment({
      testId: req.params.testId,
      teacherId: req.user.userId,
      assignedTo: req.body.assignedTo || {},
      schoolId: req.user.schoolId,
      createdAt: new Date(),
    });

    await assignment.save();

    // Update test with assignment info
    test.assignedTo = req.body.assignedTo || {};
    test.lastAssignedAt = new Date();
    await test.save();

    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error assigning test:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/exams/tests/:testId/assignments
 * Get assignments for a test
 */
router.get("/tests/:testId/assignments", auth, async (req, res) => {
  try {
    const assignments = await TestAssignment.find({
      testId: req.params.testId,
    }).populate("teacherId", "fullName email");

    res.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================= TEST ATTEMPTS - STUDENT WORKFLOW =======================

/**
 * GET /api/exams/student/tests
 * Get student's assigned tests
 */
router.get("/student/tests", auth, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ error: "Only students can access this endpoint" });
    }

    // Get assigned tests
    const assignments = await TestAssignment.find({
      $or: [
        { "assignedTo.students": req.user.userId },
        { "assignedTo.grades": req.user.grade },
        { "assignedTo.schools": req.user.schoolId },
      ],
    });

    const testIds = assignments.map((a) => a.testId);
    const tests = await Test.find({
      _id: { $in: testIds },
      status: "published",
    }).populate("createdBy", "fullName");

    // Get attempt history
    const attempts = await TestAttempt.find({
      studentId: req.user.userId,
      testId: { $in: testIds },
    });

    const testsWithAttempts = tests.map((test) => {
      const testAttempts = attempts.filter((a) => a.testId.equals(test._id));
      return {
        ...test.toObject(),
        attempts: testAttempts,
        lastAttempt: testAttempts[testAttempts.length - 1] || null,
        canRetake:
          test.allowRetest &&
          testAttempts.length < test.maxRetestAttempts,
      };
    });

    res.json(testsWithAttempts);
  } catch (error) {
    console.error("Error fetching student tests:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/exams/tests/:testId/start
 * Start test attempt
 */
router.post("/tests/:testId/start", auth, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ error: "Only students can start tests" });
    }

    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Check timing
    const now = new Date();
    if (test.startDateTime && now < test.startDateTime) {
      return res.status(400).json({
        error: "Test has not started yet",
        startsAt: test.startDateTime,
      });
    }

    if (test.endDateTime && now > test.endDateTime) {
      return res.status(400).json({
        error: "Test has ended",
        endedAt: test.endDateTime,
      });
    }

    // Check if already completed
    const completedAttempt = await TestAttempt.findOne({
      testId: req.params.testId,
      studentId: req.user.userId,
      status: "submitted",
    }).sort({ createdAt: -1 });

    if (completedAttempt && !test.allowRetest) {
      return res.status(400).json({
        error: "You have already completed this test",
        attempt: completedAttempt,
      });
    }

    // Check retest limit
    if (completedAttempt && test.allowRetest) {
      const previousAttempts = await TestAttempt.countDocuments({
        testId: req.params.testId,
        studentId: req.user.userId,
      });

      if (previousAttempts >= test.maxRetestAttempts) {
        return res.status(400).json({
          error: `Maximum attempts (${test.maxRetestAttempts}) reached`,
        });
      }

      // Check retest gap
      const daysSinceLastAttempt = Math.floor(
        (now - completedAttempt.submittedAt) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastAttempt < test.restestDaysGap) {
        return res.status(400).json({
          error: `Please wait ${test.restestDaysGap - daysSinceLastAttempt} more days before retaking`,
        });
      }
    }

    // Check for in-progress attempt
    let inProgressAttempt = await TestAttempt.findOne({
      testId: req.params.testId,
      studentId: req.user.userId,
      status: "in-progress",
    });

    let attempt;
    if (inProgressAttempt && req.body.resume === true) {
      attempt = inProgressAttempt;
    } else {
      // Create new attempt
      const attemptNumber = completedAttempt
        ? (await TestAttempt.countDocuments({
          testId: req.params.testId,
          studentId: req.user.userId,
        })) + 1
        : 1;

      attempt = new TestAttempt({
        testId: req.params.testId,
        studentId: req.user.userId,
        schoolId: req.user.schoolId,
        attemptNumber,
        status: "in-progress",
        startTime: now,
        totalMarks: test.totalMarks,
        deviceInfo: {
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
          screenResolution: req.body.screenResolution,
        },
      });

      await attempt.save();
    }

    // Get questions
    let questions = await Question.find({
      _id: { $in: test.questions },
    });

    // Apply randomization
    if (test.randomizeQuestionOrder) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Prepare questions for client (remove answers)
    const questionsForClient = questions.map((q) => {
      const qObj = q.toObject();
      if (qObj.options) {
        qObj.options = qObj.options.map((opt) => {
          const { isCorrect, ...rest } = opt;
          return rest;
        });

        if (test.randomizeOptions) {
          qObj.options = qObj.options.sort(() => Math.random() - 0.5);
        }
      }

      // Remove test case outputs for coding questions
      if (qObj.codingConfig?.testCases) {
        qObj.codingConfig.testCases = qObj.codingConfig.testCases.map(
          (tc) => {
            const { expectedOutput, ...rest } = tc;
            return rest;
          }
        );
      }

      return qObj;
    });

    res.status(201).json({
      attempt: attempt,
      questions: questionsForClient,
      testDuration: test.timeLimit,
      testConfig: {
        autoSubmitOnTimeout: test.autoSubmitOnTimeout,
        antiCheating: test.antiCheating,
      },
    });
  } catch (error) {
    console.error("Error starting test:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/exams/attempts/:attemptId/save-answer
 * Auto-save answer
 */
router.post("/attempts/:attemptId/save-answer", auth, async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    if (attempt.studentId.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { questionId, answer, timeSpent } = req.body;

    // Find or create answer
    let answerObj = attempt.answers.find(
      (a) => a.questionId.toString() === questionId
    );

    if (!answerObj) {
      const question = await Question.findById(questionId);
      answerObj = {
        questionId,
        questionType: question?.type,
        answer: null,
        timeSpent: 0,
        attempts: 1,
      };
      attempt.answers.push(answerObj);
    } else {
      answerObj.attempts += 1;
    }

    answerObj.answer = answer;
    answerObj.timeSpent = timeSpent || 0;

    attempt.lastActivityTime = new Date();
    await attempt.save();

    res.json({ message: "Answer saved successfully" });
  } catch (error) {
    console.error("Error saving answer:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/exams/attempts/:attemptId/review
 * Mark question for review
 */
router.post("/attempts/:attemptId/review", auth, async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    const { questionId, reviewFlag } = req.body;

    const answer = attempt.answers.find(
      (a) => a.questionId.toString() === questionId
    );

    if (answer) {
      answer.reviewFlag = reviewFlag || false;
    }

    await attempt.save();
    res.json({ message: "Review flag updated" });
  } catch (error) {
    console.error("Error updating review flag:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/exams/attempts/:attemptId
 * Get attempt details
 */
router.get("/attempts/:attemptId", auth, async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId)
      .populate("testId")
      .populate("violations")
      .populate({
        path: "answers.questionId",
        model: "Question",
      });

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    // Authorization check
    if (
      attempt.studentId.toString() !== req.user.userId &&
      req.user.role !== "teacher" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(attempt);
  } catch (error) {
    console.error("Error fetching attempt:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/exams/attempts/:attemptId/submit
 * Submit test
 */
router.post("/attempts/:attemptId/submit", auth, async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    if (attempt.studentId.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Already submitted
    if (attempt.status === "submitted") {
      return res.status(400).json({ error: "Test already submitted" });
    }

    const test = await Test.findById(attempt.testId);
    const questions = await Question.find({
      _id: { $in: test.questions },
    });

    // Evaluate answers
    let totalMarks = 0;
    let obtainedMarks = 0;
    let autoEvaluableCount = 0;
    let manualEvaluationCount = 0;

    for (const answer of attempt.answers) {
      const question = questions.find((q) => q._id.equals(answer.questionId));
      if (!question) continue;

      totalMarks += question.marks;

      const isCorrect = evaluateAnswer(answer, question);

      if (isCorrect !== null) {
        // Auto-evaluable
        const marks = calculateMarks(isCorrect, question, test.negativeMarking);
        answer.marksObtained = marks;
        answer.isCorrect = isCorrect;
        obtainedMarks += marks;
        autoEvaluableCount++;
        answer.evaluationStatus = "auto-evaluated";
      } else {
        // Requires manual evaluation
        answer.marksObtained = 0;
        answer.evaluationStatus = "pending";
        manualEvaluationCount++;
      }
    }

    attempt.status = "submitted";
    attempt.endTime = new Date();
    attempt.actualTimeSpent = Math.floor(
      (attempt.endTime - attempt.startTime) / 1000
    );
    attempt.submissionMethod = req.body.submissionMethod || "manual";
    attempt.totalMarks = totalMarks;
    attempt.totalMarksObtained = Math.max(obtainedMarks, 0);
    attempt.percentage =
      totalMarks > 0 ? (attempt.totalMarksObtained / totalMarks) * 100 : 0;
    attempt.passed = attempt.totalMarksObtained >= test.passingMarks;

    if (manualEvaluationCount > 0) {
      attempt.evaluationStatus = "pending";
    } else if (autoEvaluableCount > 0) {
      attempt.evaluationStatus = "auto-evaluated";
    }

    attempt.questionsAttempted = attempt.answers.filter(
      (a) => a.answer !== null
    ).length;
    attempt.questionsSkipped =
      attempt.answers.length - attempt.questionsAttempted;

    if (attempt.answers.length > 0) {
      attempt.averageTimePerQuestion =
        attempt.actualTimeSpent / attempt.answers.length;
    }

    await attempt.save();

    // Update test analytics
    await updateTestAnalytics(test._id);

    res.json({
      message: "Test submitted successfully",
      attempt: {
        _id: attempt._id,
        totalMarksObtained: attempt.totalMarksObtained,
        percentage: attempt.percentage,
        passed: attempt.passed,
        evaluationStatus: attempt.evaluationStatus,
      },
    });
  } catch (error) {
    console.error("Error submitting test:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/exams/attempts/:attemptId/violation
 * Log anti-cheating violation
 */
router.post("/attempts/:attemptId/violation", auth, async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    const test = await Test.findById(attempt.testId);

    const violation = new CheatingViolation({
      testAttemptId: req.params.attemptId,
      testId: attempt.testId,
      studentId: attempt.studentId,
      violationType: req.body.violationType,
      description: req.body.description,
      severity: req.body.severity || "warning",
      violationTime: new Date(),
      elapsedTimeFromStart: Math.floor(
        (new Date() - attempt.startTime) / 1000
      ),
      deviceInfo: {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        screenResolution: req.body.screenResolution,
      },
      automaticallyDetected: true,
    });

    await violation.save();
    attempt.violations.push(violation._id);
    attempt.violationCount += 1;

    // Check thresholds
    if (
      test.antiCheating.enabled &&
      attempt.violationCount >= test.antiCheating.violationThresholds.autoSubmitAt
    ) {
      // Auto-submit test
      attempt.status = "submitted";
      attempt.endTime = new Date();
      attempt.isAutoSubmitted = true;
      attempt.submissionMethod = "auto-violation-threshold";

      // Quick evaluation
      // ... (evaluation logic)
    } else if (
      test.antiCheating.enabled &&
      attempt.violationCount >= test.antiCheating.violationThresholds.warningAt
    ) {
      attempt.suspiciousBehavior = true;
    }

    await attempt.save();

    res.status(201).json({
      violation,
      autoSubmitted: attempt.status === "submitted",
      violationCount: attempt.violationCount,
      warningThreshold: test.antiCheating.violationThresholds.warningAt,
      autoSubmitThreshold: test.antiCheating.violationThresholds.autoSubmitAt,
    });
  } catch (error) {
    console.error("Error logging violation:", error);
    res.status(400).json({ error: error.message });
  }
});

// ======================= REPORTING & ANALYTICS =======================

/**
 * GET /api/exams/tests/:testId/report
 * Get test report (Teacher/Admin)
 */
router.get("/tests/:testId/report", auth, async (req, res) => {
  try {
    const { role, userId, schoolId } = req.user;

    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Authorization
    if (role === "teacher" && test.createdBy.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (["admin", "cto"].includes(role) && test.schoolId.toString() !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (role === "student") {
      return res.status(403).json({ error: "Students cannot access reports" });
    }

    const attempts = await TestAttempt.find({ testId: req.params.testId })
      .populate("studentId", "fullName rollNumber email")
      .populate({
        path: "violations",
      });

    // Calculate statistics
    const stats = {
      totalAttempts: attempts.length,
      passedAttempts: attempts.filter((a) => a.passed).length,
      failedAttempts: attempts.filter((a) => !a.passed).length,
      averageScore: attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length || 0,
      highestScore: Math.max(...attempts.map((a) => a.percentage), 0),
      lowestScore: Math.min(...attempts.map((a) => a.percentage), 0),
      passPercentage:
        attempts.length > 0
          ? (attempts.filter((a) => a.passed).length / attempts.length) * 100
          : 0,
      averageTimeSpent:
        attempts.reduce((sum, a) => sum + a.actualTimeSpent, 0) /
        (attempts.length || 1),
      totalViolations: attempts.reduce((sum, a) => sum + a.violationCount, 0),
    };

    // Question-wise accuracy
    const questionAccuracy = {};
    test.questions.forEach((qId) => {
      let correct = 0;
      let total = 0;

      attempts.forEach((attempt) => {
        const answer = attempt.answers.find((a) =>
          a.questionId.equals(qId)
        );
        if (answer) {
          total++;
          if (answer.isCorrect) correct++;
        }
      });

      questionAccuracy[qId] = {
        accuracy: total > 0 ? (correct / total) * 100 : 0,
        attempted: total,
      };
    });

    res.json({
      test: {
        title: test.title,
        totalMarks: test.totalMarks,
        passingMarks: test.passingMarks,
      },
      statistics: stats,
      questionAccuracy,
      attempts: attempts.map((a) => ({
        studentName: a.studentId?.fullName,
        studentEmail: a.studentId?.email,
        totalMarks: a.totalMarksObtained,
        percentage: a.percentage,
        passed: a.passed,
        timeSpent: a.actualTimeSpent,
        violations: a.violationCount,
        status: a.evaluationStatus,
      })),
    });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/exams/admin/analytics
 * Get admin analytics (CEO/Admin only)
 */
router.get("/admin/analytics", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const tests = await Test.find({ schoolId: req.user.schoolId });
    const attempts = await TestAttempt.find({
      testId: { $in: tests.map((t) => t._id) },
    });

    const violations = await CheatingViolation.find({
      testId: { $in: tests.map((t) => t._id) },
    });

    const stats = {
      totalTests: tests.length,
      publishedTests: tests.filter((t) => t.status === "published").length,
      totalAttempts: attempts.length,
      totalParticipants: new Set(attempts.map((a) => a.studentId.toString())).size,
      overallPassPercentage:
        attempts.length > 0
          ? (attempts.filter((a) => a.passed).length / attempts.length) * 100
          : 0,
      averageScore:
        attempts.reduce((sum, a) => sum + a.percentage, 0) /
        (attempts.length || 1),
      totalViolations: violations.length,
      violationsByType: violations.reduce((acc, v) => {
        acc[v.violationType] = (acc[v.violationType] || 0) + 1;
        return acc;
      }, {}),
    };

    // School ranking if multi-school
    const schoolRanking = [];

    res.json(stats);
  } catch (error) {
    console.error("Error generating admin analytics:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================= HELPER FUNCTIONS =======================

/**
 * Update test analytics after submission
 */
async function updateTestAnalytics(testId) {
  try {
    const test = await Test.findById(testId);
    const attempts = await TestAttempt.find({
      testId,
      status: "submitted",
    });

    if (attempts.length === 0) return;

    const scores = attempts.map((a) => a.percentage);
    test.totalAttempts = attempts.length;
    test.averageScore =
      scores.reduce((a, b) => a + b, 0) / scores.length;
    test.passPercentage =
      (attempts.filter((a) => a.passed).length / attempts.length) * 100;

    await test.save();
  } catch (error) {
    console.error("Error updating test analytics:", error);
  }
}

module.exports = router;


