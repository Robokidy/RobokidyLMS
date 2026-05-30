const express = require("express");
const router = express.Router();
const Test = require("../models/Test");
const TestAttempt = require("../models/TestAttempt");
const Violation = require("../models/Violation");
const Report = require("../models/Report");
const { auth } = require("../middleware/auth");
const User = require("../models/User");

// ==================== TEACHER REPORTING ====================

// Get teacher's test analytics
router.get("/teacher/analytics", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const tests = await Test.find({ createdBy: req.user.userId });
    const testIds = tests.map((t) => t._id);

    const attempts = await TestAttempt.find({
      testId: { $in: testIds },
    }).populate("studentId", "name email");

    const analytics = {
      totalTests: tests.length,
      totalAttempts: attempts.length,
      publishedTests: tests.filter((t) => t.status === "published").length,
      draftTests: tests.filter((t) => t.status === "draft").length,
      averagePassRate: 0,
      averageScore: 0,
      mostDifficultTopics: [],
      topPerformers: [],
      testMetrics: [],
    };

    // Calculate overall metrics
    if (attempts.length > 0) {
      const passedAttempts = attempts.filter((a) => a.passed).length;
      analytics.averagePassRate = (passedAttempts / attempts.length) * 100;
      analytics.averageScore =
        attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length;
    }

    // Get per-test metrics
    for (const test of tests) {
      const testAttempts = attempts.filter((a) => a.testId.equals(test._id));
      if (testAttempts.length === 0) continue;

      const passCount = testAttempts.filter((a) => a.passed).length;
      const avgScore =
        testAttempts.reduce((sum, a) => sum + a.percentage, 0) /
        testAttempts.length;
      const avgTime =
        testAttempts.reduce((sum, a) => sum + a.actualTimeSpent, 0) /
        testAttempts.length;

      analytics.testMetrics.push({
        testId: test._id,
        testTitle: test.title,
        attempts: testAttempts.length,
        passCount,
        passRate: (passCount / testAttempts.length) * 100,
        averageScore: avgScore,
        averageTimeSpent: avgTime,
        topicsCoreTags: test.tags || [],
      });
    }

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed student-wise report for a test
router.get("/tests/:testId/student-reports", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).populate("questions");

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    if (test.createdBy.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const attempts = await TestAttempt.find({
      testId: req.params.testId,
    }).populate("studentId", "name email");

    const studentReports = attempts.map((attempt) => {
      const correctAnswers = attempt.answers.filter((a) => a.isCorrect).length;

      return {
        studentId: attempt.studentId._id,
        studentName: attempt.studentId.name,
        studentEmail: attempt.studentId.email,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        totalScore: attempt.totalMarksObtained,
        percentage: attempt.percentage,
        passed: attempt.passed,
        correctAnswers,
        totalQuestions: attempt.answers.length,
        accuracy: attempt.answers.length
          ? (correctAnswers / attempt.answers.length) * 100
          : 0,
        timeSpent: attempt.actualTimeSpent,
        violations: attempt.violationCount,
        startTime: attempt.startTime,
        endTime: attempt.endTime,
        reviewFlag: attempt.answers.filter((a) => a.reviewFlag).length,
      };
    });

    // Sort by score
    studentReports.sort((a, b) => b.totalScore - a.totalScore);

    res.json(studentReports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get question-wise analysis
router.get("/tests/:testId/question-analysis", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).populate("questions");

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    if (test.createdBy.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const attempts = await TestAttempt.find({ testId: req.params.testId });

    const questionAnalysis = test.questions.map((question) => {
      let correctCount = 0;
      let wrongCount = 0;
      let skippedCount = 0;
      let averageTimeSpent = 0;

      const questionAnswers = attempts.flatMap((a) =>
        a.answers.filter((ans) => ans.questionId.equals(question._id))
      );

      questionAnswers.forEach((answer) => {
        if (!answer.answer) {
          skippedCount++;
        } else if (answer.isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
        averageTimeSpent += answer.timeSpent || 0;
      });

      return {
        questionId: question._id,
        questionNumber: question.questionNumber,
        questionType: question.type,
        marks: question.marks,
        difficulty: question.difficulty || "Medium",
        totalResponses: questionAnswers.length,
        correctCount,
        wrongCount,
        skippedCount,
        accuracy:
          questionAnswers.length > 0
            ? (correctCount / questionAnswers.length) * 100
            : 0,
        averageTimeSpent:
          questionAnswers.length > 0
            ? averageTimeSpent / questionAnswers.length
            : 0,
      };
    });

    res.json(questionAnalysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get topic/tag-wise analysis
router.get("/tests/:testId/topic-analysis", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).populate("questions");

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    if (test.createdBy.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const attempts = await TestAttempt.find({ testId: req.params.testId });

    // Group questions by tags
    const tagGroups = {};
    test.questions.forEach((question) => {
      const tags = question.tags || ["General"];
      tags.forEach((tag) => {
        if (!tagGroups[tag]) {
          tagGroups[tag] = [];
        }
        tagGroups[tag].push(question);
      });
    });

    const topicAnalysis = Object.entries(tagGroups).map(([topic, questions]) => {
      let totalCorrect = 0;
      let totalAttempted = 0;
      let totalTimeSpent = 0;

      questions.forEach((question) => {
        attempts.forEach((attempt) => {
          const answer = attempt.answers.find((a) =>
            a.questionId.equals(question._id)
          );
          if (answer) {
            totalAttempted++;
            if (answer.isCorrect) {
              totalCorrect++;
            }
            totalTimeSpent += answer.timeSpent || 0;
          }
        });
      });

      return {
        topic,
        questionsCount: questions.length,
        totalAttempted,
        correctCount: totalCorrect,
        accuracy:
          totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0,
        averageTimeSpent:
          totalAttempted > 0 ? totalTimeSpent / totalAttempted : 0,
      };
    });

    res.json(topicAnalysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cheating violations report
router.get("/tests/:testId/violations", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    if (test.createdBy.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const violations = await Violation.find({
      testId: req.params.testId,
    })
      .populate("studentId", "name email")
      .populate("testAttemptId")
      .sort({ timestamp: -1 });

    const violationSummary = {};
    violations.forEach((violation) => {
      if (!violationSummary[violation.studentId._id]) {
        violationSummary[violation.studentId._id] = {
          studentId: violation.studentId._id,
          studentName: violation.studentId.name,
          studentEmail: violation.studentId.email,
          totalViolations: 0,
          violationTypes: {},
          firstViolationTime: violation.timestamp,
          lastViolationTime: violation.timestamp,
          severity: "none",
        };
      }

      violationSummary[violation.studentId._id].totalViolations++;
      violationSummary[violation.studentId._id].violationType[
        violation.violationType
      ] = (violationSummary[violation.studentId._id].violationType[
        violation.violationType
      ] || 0) + 1;
      violationSummary[violation.studentId._id].lastViolationTime =
        violation.timestamp;

      if (violation.severity === "severe") {
        violationSummary[violation.studentId._id].severity = "severe";
      } else if (
        violationSummary[violation.studentId._id].severity !== "severe"
      ) {
        violationSummary[violation.studentId._id].severity = violation.severity;
      }
    });

    res.json({
      violations,
      summary: Object.values(violationSummary),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate and retrieve test report
router.post("/tests/:testId/generate-report", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).populate("questions");

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    if (test.createdBy.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const attempts = await TestAttempt.find({ testId: req.params.testId }).populate(
      "studentId"
    );
    const violations = await Violation.find({ testId: req.params.testId });

    // Build comprehensive report data
    const reportData = {
      totalStudents: new Set(attempts.map((a) => a.studentId._id)).size,
      totalAttempts: attempts.length,
      passCount: attempts.filter((a) => a.passed).length,
      failCount: attempts.filter((a) => !a.passed).length,
      averageScore:
        attempts.length > 0
          ? attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length
          : 0,
      totalViolations: violations.length,
      questionsAnalysis: test.questions.map((q) => {
        const qAnswers = attempts.flatMap((a) =>
          a.answers.filter((ans) => ans.questionId.equals(q._id))
        );
        return {
          questionId: q._id,
          correctCount: qAnswers.filter((a) => a.isCorrect).length,
          totalAttempts: qAnswers.length,
          accuracy:
            qAnswers.length > 0
              ? (qAnswers.filter((a) => a.isCorrect).length / qAnswers.length) *
                100
              : 0,
        };
      }),
      scoreDistribution: calculateScoreDistribution(attempts),
      topPerformers: attempts
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 10)
        .map((a) => ({
          studentId: a.studentId._id,
          studentName: a.studentId.name,
          score: a.percentage,
        })),
      weakTopics: identifyWeakTopics(test.questions, attempts),
    };

    // Save report to database
    const report = new Report({
      testId: req.params.testId,
      reportType: "test-analytics",
      generatedBy: req.user.userId,
      data: reportData,
      format: req.body.format || "json",
    });

    await report.save();

    res.json({
      report,
      message: "Report generated successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

function calculateScoreDistribution(attempts) {
  const ranges = {
    "0-20": 0,
    "21-40": 0,
    "41-60": 0,
    "61-80": 0,
    "81-100": 0,
  };

  attempts.forEach((attempt) => {
    const percentage = attempt.percentage;
    if (percentage <= 20) ranges["0-20"]++;
    else if (percentage <= 40) ranges["21-40"]++;
    else if (percentage <= 60) ranges["41-60"]++;
    else if (percentage <= 80) ranges["61-80"]++;
    else ranges["81-100"]++;
  });

  return ranges;
}

function identifyWeakTopics(questions, attempts) {
  const topicAccuracy = {};

  questions.forEach((question) => {
    const tags = question.tags || ["General"];
    tags.forEach((tag) => {
      if (!topicAccuracy[tag]) {
        topicAccuracy[tag] = { correct: 0, total: 0 };
      }

      attempts.forEach((attempt) => {
        const answer = attempt.answers.find((a) =>
          a.questionId.equals(question._id)
        );
        if (answer) {
          topicAccuracy[tag].total++;
          if (answer.isCorrect) {
            topicAccuracy[tag].correct++;
          }
        }
      });
    });
  });

  return Object.entries(topicAccuracy)
    .map(([topic, data]) => ({
      topic,
      accuracy:
        data.total > 0 ? (data.correct / data.total) * 100 : 0,
      totalQuestions: data.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);
}

module.exports = router;
