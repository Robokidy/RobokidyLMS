const express = require("express");
const router = express.Router();
const Test = require("../models/Test");
const Question = require("../models/Question");
const TestAttempt = require("../models/TestAttempt");
const TestAssignment = require("../models/TestAssignment");
const CheatingViolation = require("../models/CheatingViolation");
const CodingSubmission = require("../models/CodingSubmission");
const TestReport = require("../models/TestReport");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

// ==================== TEST CRUD OPERATIONS ====================

// Get all tests (with role-based filtering)
router.get("/tests", auth, async (req, res) => {
  try {
    const { role, userId, schoolId } = req.user;
    let query = {};

    if (role === "teacher") {
      query = { createdBy: userId };
    } else if (role === "admin") {
      query = { schoolId };
    } else if (role === "student") {
      // Students see assigned tests only - handled via TestAssignment
      return res.json([]);
    }

    const tests = await Test.find(query)
      .populate("createdBy", "name email")
      .populate("questions");

    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single test details
router.get("/tests/:testId", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId)
      .populate("createdBy", "name email")
      .populate("questions");

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new test
router.post("/tests", auth, async (req, res) => {
  try {
    const { role, userId, schoolId } = req.user;

    if (role !== "teacher" && role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const testData = {
      ...req.body,
      createdBy: userId,
      schoolId,
    };

    const test = new Test(testData);
    await test.save();

    res.status(201).json(test);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update test
router.put("/tests/:testId", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    if (test.createdBy.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    Object.assign(test, req.body);
    await test.save();

    res.json(test);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete test
router.delete("/tests/:testId", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    if (test.createdBy.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Test.findByIdAndDelete(req.params.testId);
    await Question.deleteMany({ testId: req.params.testId });

    res.json({ message: "Test deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== QUESTION MANAGEMENT ====================

// Add question to test
router.post("/tests/:testId/questions", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    const question = new Question({
      ...req.body,
      testId: req.params.testId,
      createdBy: req.user.userId,
    });

    await question.save();
    test.questions.push(question._id);
    await test.save();

    res.status(201).json(question);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update question
router.put("/questions/:questionId", auth, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.questionId,
      req.body,
      { new: true }
    );

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json(question);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete question
router.delete("/questions/:questionId", auth, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.questionId);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    await Test.findByIdAndUpdate(question.testId, {
      $pull: { questions: question._id },
    });

    res.json({ message: "Question deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TEST ASSIGNMENT ====================

// Assign test to students/classes
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

    const assignment = new TestAssignment({
      testId: req.params.testId,
      teacherId: req.user.userId,
      ...req.body,
    });

    await assignment.save();

    // Update test's assignedTo field
    test.assignedTo = {
      ...req.body.assignedTo,
    };
    await test.save();

    res.status(201).json(assignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get test assignments
router.get("/tests/:testId/assignments", auth, async (req, res) => {
  try {
    const assignments = await TestAssignment.find({
      testId: req.params.testId,
    }).populate("assignedTo.studentIds");

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TEST ATTEMPTS ====================

// Start test attempt
router.post("/tests/:testId/start", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    const now = new Date();
    if (now < test.startDateTime || now > test.endDateTime) {
      return res.status(400).json({ error: "Test is not available at this time" });
    }

    const existingAttempt = await TestAttempt.findOne({
      testId: req.params.testId,
      studentId: req.user.userId,
      status: { $in: ["in-progress", "submitted"] },
    });

    if (
      existingAttempt &&
      !test.allowRetest
    ) {
      return res.status(400).json({ error: "You have already completed this test" });
    }

    const attemptNumber = existingAttempt
      ? existingAttempt.attemptNumber + 1
      : 1;

    const attempt = new TestAttempt({
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
      },
    });

    await attempt.save();

    const questions = await Question.find({ testId: req.params.testId });

    let questionsToSend = JSON.parse(JSON.stringify(questions));

    // Remove answers if randomizing
    if (test.randomizeQuestionOrder) {
      questionsToSend = questionsToSend.sort(() => Math.random() - 0.5);
    }

    if (test.randomizeOptions) {
      questionsToSend = questionsToSend.map((q) => {
        if (q.options && q.options.length > 0) {
          q.options = q.options.sort(() => Math.random() - 0.5);
        }
        return q;
      });
    }

    // Hide correct answers on client
    questionsToSend = questionsToSend.map((q) => {
      const questionObj = q.toObject ? q.toObject() : q;
      if (questionObj.options) {
        questionObj.options = questionObj.options.map((opt) => {
          const { isCorrect, ...rest } = opt;
          return rest;
        });
      }
      return questionObj;
    });

    res.status(201).json({
      attempt: attempt,
      questions: questionsToSend,
      testDuration: test.timeLimit,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Save answer (auto-save)
router.post("/attempts/:attemptId/save-answer", auth, async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    const { questionId, answer } = req.body;

    const existingAnswer = attempt.answers.find(
      (a) => a.questionId.toString() === questionId
    );

    if (existingAnswer) {
      existingAnswer.answer = answer;
      existingAnswer.timeSpent = req.body.timeSpent || 0;
    } else {
      attempt.answers.push({
        questionId,
        questionType: req.body.questionType,
        answer,
        timeSpent: req.body.timeSpent || 0,
      });
    }

    attempt.lastActivityTime = new Date();
    await attempt.save();

    res.json({ message: "Answer saved" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark question for review
router.post("/attempts/:attemptId/review-question", auth, async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    const answer = attempt.answers.find(
      (a) => a.questionId.toString() === req.body.questionId
    );

    if (answer) {
      answer.reviewFlag = req.body.reviewFlag;
    }

    await attempt.save();
    res.json({ message: "Review flag updated" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== CHEATING DETECTION ====================

// Report cheating violation
router.post("/attempts/:attemptId/violation", auth, async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    const violation = new CheatingViolation({
      testAttemptId: req.params.attemptId,
      testId: attempt.testId,
      studentId: attempt.studentId,
      ...req.body,
      violationTime: new Date(),
      elapsedTimeFromStart: attempt.startTime
        ? Math.floor((new Date() - attempt.startTime) / 1000)
        : 0,
    });

    await violation.save();
    attempt.violations.push(violation._id);
    attempt.violationCount += 1;

    // Check for auto-submit threshold
    const test = await Test.findById(attempt.testId);
    if (
      attempt.violationCount >=
      test.antiCheating.violationThresholds.autoSubmitAt
    ) {
      attempt.status = "submitted";
      attempt.isAutoSubmitted = true;
      attempt.submissionMethod = "auto-violation-threshold";
    }

    await attempt.save();

    res.status(201).json({
      violation,
      autoSubmitted: attempt.status === "submitted",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== TEST SUBMISSION ====================

// Submit test
router.post("/attempts/:attemptId/submit", auth, async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    attempt.status = "submitted";
    attempt.endTime = new Date();
    attempt.actualTimeSpent = Math.floor(
      (attempt.endTime - attempt.startTime) / 1000
    );
    attempt.submissionMethod = "manual";

    // Auto-evaluate
    const test = await Test.findById(attempt.testId);
    const questions = await Question.find({ _id: { $in: test.questions } });

    let totalMarks = 0;
    let obtainedMarks = 0;

    for (const answer of attempt.answers) {
      const question = questions.find((q) => q._id.equals(answer.questionId));

      if (!question) continue;

      const isCorrect = evaluateAnswer(answer, question);
      answer.isCorrect = isCorrect;

      if (isCorrect) {
        answer.marksObtained = question.marks;
        obtainedMarks += question.marks;
      } else if (isCorrect === false && test.negativeMarking.enabled) {
        answer.marksObtained = -test.negativeMarking.marksPerWrongAnswer;
        obtainedMarks -= test.negativeMarking.marksPerWrongAnswer;
      }

      totalMarks += question.marks;
    }

    attempt.totalMarks = totalMarks;
    attempt.totalMarksObtained = Math.max(obtainedMarks, 0);
    attempt.percentage = (attempt.totalMarksObtained / totalMarks) * 100;
    attempt.passed = attempt.totalMarksObtained >= test.passingMarks;
    attempt.evaluationStatus = "auto-evaluated";
    attempt.evaluatedAt = new Date();
    attempt.questionsAttempted = attempt.answers.filter((a) => a.answer).length;
    attempt.questionsSkipped = attempt.answers.length - attempt.questionsAttempted;

    if (attempt.answers.length > 0) {
      attempt.averageTimePerQuestion =
        attempt.actualTimeSpent / attempt.answers.length;
    }

    await attempt.save();

    // Update test analytics
    test.totalAttempts += 1;
    if (attempt.passed) {
      const passedAttempts = await TestAttempt.countDocuments({
        testId: attempt.testId,
        passed: true,
      });
      test.passPercentage = (passedAttempts / test.totalAttempts) * 100;
    }

    const allAttempts = await TestAttempt.find({ testId: attempt.testId });
    const totalMarksArray = allAttempts.map((a) => a.totalMarksObtained);
    test.averageScore =
      totalMarksArray.reduce((a, b) => a + b, 0) / totalMarksArray.length;

    await test.save();

    res.json({
      message: "Test submitted successfully",
      attempt,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== STUDENT ENDPOINTS ====================

// Get student's assigned tests
router.get("/student/assigned-tests", auth, async (req, res) => {
  try {
    const assignments = await TestAssignment.find({
      $or: [
        { "assignedTo.studentIds": req.user.userId },
        { "assignedTo.classIds": req.user.classId },
        { "assignedTo.sectionIds": req.user.sectionId },
      ],
    }).populate("testId");

    const tests = assignments.map((a) => a.testId);

    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get student's test attempts
router.get("/student/attempts", auth, async (req, res) => {
  try {
    const attempts = await TestAttempt.find({
      studentId: req.user.userId,
    })
      .populate("testId")
      .sort({ createdAt: -1 });

    res.json(attempts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific attempt details
router.get("/attempts/:attemptId", auth, async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId)
      .populate("testId")
      .populate("violations");

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    // Check authorization
    if (
      attempt.studentId.toString() !== req.user.userId &&
      req.user.role !== "teacher" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(attempt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

function evaluateAnswer(answer, question) {
  if (!answer.answer) return null;

  switch (question.type) {
    case "mcq":
    case "true-false":
      const selectedOption = question.options.find(
        (o) => o.optionId === answer.answer
      );
      return selectedOption ? selectedOption.isCorrect : false;

    case "multi-select":
      const selectedOptions = Array.isArray(answer.answer)
        ? answer.answer
        : [answer.answer];
      const correctOptions = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.optionId);
      return (
        selectedOptions.length === correctOptions.length &&
        selectedOptions.every((opt) => correctOptions.includes(opt))
      );

    case "fill-blank":
      if (!question.blanks || question.blanks.length === 0) return null;
      const blank = question.blanks[0];
      const userAnswer = question.blanks[0].caseSensitive
        ? answer.answer
        : answer.answer.toLowerCase();
      const correctAnswer = blank.caseSensitive
        ? blank.correctAnswer
        : blank.correctAnswer.toLowerCase();
      return (
        userAnswer === correctAnswer ||
        (blank.acceptableVariations &&
          blank.acceptableVariations.some((v) =>
            question.blanks[0].caseSensitive
              ? v === answer.answer
              : v.toLowerCase() === userAnswer
          ))
      );

    case "match-following":
      if (!question.matchingPairs || question.matchingPairs.length === 0)
        return null;
      const userMatches = answer.answer;
      return question.matchingPairs.every((pair) => {
        const userMatch = userMatches.find(
          (m) => m.leftId === pair.leftId
        );
        return userMatch && userMatch.rightId === pair.rightId;
      });

    case "descriptive":
    case "coding":
      return null; // Manual evaluation required

    default:
      return null;
  }
}

module.exports = router;
