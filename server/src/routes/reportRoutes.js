const express = require("express");
const router = express.Router();
const Test = require("../models/Test");
const TestAttempt = require("../models/TestAttempt");
const TestReport = require("../models/TestReport");
const Question = require("../models/Question");
const CheatingViolation = require("../models/CheatingViolation");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

// ==================== TEACHER REPORTS ====================

// Get student-wise report for a test
router.get("/tests/:testId/student-wise", auth, async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role !== "teacher" && role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    const attempts = await TestAttempt.find({
      testId: req.params.testId,
    }).populate("studentId", "name email");

    const studentWiseData = attempts.map((attempt) => ({
      studentId: attempt.studentId._id,
      studentName: attempt.studentId.name,
      email: attempt.studentId.email,
      attempts: attempts.filter(
        (a) => a.studentId._id.toString() === attempt.studentId._id.toString()
      ).length,
      highestScore: Math.max(
        ...attempts
          .filter(
            (a) => a.studentId._id.toString() === attempt.studentId._id.toString()
          )
          .map((a) => a.totalMarksObtained)
      ),
      averageScore:
        attempts
          .filter(
            (a) => a.studentId._id.toString() === attempt.studentId._id.toString()
          )
          .reduce((sum, a) => sum + a.totalMarksObtained, 0) /
        attempts.filter(
          (a) => a.studentId._id.toString() === attempt.studentId._id.toString()
        ).length,
      averagePercentage:
        attempts
          .filter(
            (a) => a.studentId._id.toString() === attempt.studentId._id.toString()
          )
          .reduce((sum, a) => sum + a.percentage, 0) /
        attempts.filter(
          (a) => a.studentId._id.toString() === attempt.studentId._id.toString()
        ).length,
      lastAttemptDate: attempts
        .filter(
          (a) => a.studentId._id.toString() === attempt.studentId._id.toString()
        )
        .sort((a, b) => b.endTime - a.endTime)[0]?.endTime,
      passed: attempts
        .filter(
          (a) => a.studentId._id.toString() === attempt.studentId._id.toString()
        )
        .some((a) => a.passed),
      violations: attempts
        .filter(
          (a) => a.studentId._id.toString() === attempt.studentId._id.toString()
        )
        .reduce((sum, a) => sum + a.violationCount, 0),
    }));

    res.json(studentWiseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get question-wise analysis
router.get("/tests/:testId/question-wise", auth, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "teacher" && role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const test = await Test.findById(req.params.testId).populate("questions");
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    const attempts = await TestAttempt.find({ testId: req.params.testId });

    const questionAnalytics = test.questions.map((question) => {
      const answersForQuestion = attempts.flatMap((a) =>
        a.answers.filter((ans) => ans.questionId.equals(question._id))
      );

      const correctAnswers = answersForQuestion.filter((a) => a.isCorrect).length;
      const totalAttempts = answersForQuestion.length;

      return {
        questionId: question._id,
        questionText: question.questionText,
        type: question.type,
        difficulty: question.difficulty,
        topic: question.topic,
        marks: question.marks,
        totalAttempts,
        correctAttempts: correctAnswers,
        accuracy: totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0,
        averageTimeSpent:
          totalAttempts > 0
            ? answersForQuestion.reduce((sum, a) => sum + (a.timeSpent || 0), 0) /
              totalAttempts
            : 0,
        difficultyIndex:
          totalAttempts > 0 ? 1 - correctAnswers / totalAttempts : 0,
      };
    });

    res.json(questionAnalytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get class-wise performance
router.get("/tests/:testId/class-wise", auth, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "teacher" && role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    const attempts = await TestAttempt.find({
      testId: req.params.testId,
    }).populate("studentId");

    // Group by class
    const classWiseData = {};

    attempts.forEach((attempt) => {
      const classId = attempt.classId || "unknown";
      if (!classWiseData[classId]) {
        classWiseData[classId] = {
          classId,
          totalAttempts: 0,
          passedAttempts: 0,
          failedAttempts: 0,
          averageScore: 0,
          totalMarks: 0,
          totalParticipants: new Set(),
        };
      }

      classWiseData[classId].totalAttempts += 1;
      classWiseData[classId].totalMarks += attempt.totalMarksObtained;
      classWiseData[classId].totalParticipants.add(attempt.studentId._id);

      if (attempt.passed) {
        classWiseData[classId].passedAttempts += 1;
      } else {
        classWiseData[classId].failedAttempts += 1;
      }
    });

    const result = Object.values(classWiseData).map((data) => ({
      ...data,
      totalParticipants: data.totalParticipants.size,
      averageScore:
        data.totalAttempts > 0 ? data.totalMarks / data.totalAttempts : 0,
      passPercentage:
        data.totalAttempts > 0
          ? (data.passedAttempts / data.totalAttempts) * 100
          : 0,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get weak topics analysis
router.get("/tests/:testId/weak-topics", auth, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "teacher" && role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const test = await Test.findById(req.params.testId).populate("questions");
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    const attempts = await TestAttempt.find({ testId: req.params.testId });

    const topicAnalysis = {};

    test.questions.forEach((question) => {
      const topic = question.topic || "uncategorized";
      const answersForQuestion = attempts.flatMap((a) =>
        a.answers.filter((ans) => ans.questionId.equals(question._id))
      );

      const correctAnswers = answersForQuestion.filter((a) => a.isCorrect).length;
      const totalAttempts = answersForQuestion.length;

      if (!topicAnalysis[topic]) {
        topicAnalysis[topic] = {
          topic,
          totalQuestions: 0,
          correctAttempts: 0,
          totalAttempts: 0,
          questions: [],
        };
      }

      topicAnalysis[topic].totalQuestions += 1;
      topicAnalysis[topic].correctAttempts += correctAnswers;
      topicAnalysis[topic].totalAttempts += totalAttempts;
      topicAnalysis[topic].questions.push({
        questionId: question._id,
        accuracy: totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0,
      });
    });

    const result = Object.values(topicAnalysis).map((data) => ({
      ...data,
      accuracy:
        data.totalAttempts > 0
          ? (data.correctAttempts / data.totalAttempts) * 100
          : 0,
    }));

    res.json(result.sort((a, b) => a.accuracy - b.accuracy));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get performance distribution
router.get(
  "/tests/:testId/performance-distribution",
  auth,
  async (req, res) => {
    try {
      const { role } = req.user;

      if (role !== "teacher" && role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const test = await Test.findById(req.params.testId);
      if (!test) {
        return res.status(404).json({ error: "Test not found" });
      }

      const attempts = await TestAttempt.find({ testId: req.params.testId });

      const distribution = {
        excellent: 0, // > 90%
        good: 0, // 75-90%
        average: 0, // 60-75%
        poor: 0, // < 60%
      };

      attempts.forEach((attempt) => {
        const percentage = attempt.percentage;
        if (percentage > 90) {
          distribution.excellent += 1;
        } else if (percentage >= 75) {
          distribution.good += 1;
        } else if (percentage >= 60) {
          distribution.average += 1;
        } else {
          distribution.poor += 1;
        }
      });

      const total = attempts.length;
      const result = {
        excellent: {
          count: distribution.excellent,
          percentage:
            total > 0 ? (distribution.excellent / total) * 100 : 0,
        },
        good: {
          count: distribution.good,
          percentage: total > 0 ? (distribution.good / total) * 100 : 0,
        },
        average: {
          count: distribution.average,
          percentage:
            total > 0 ? (distribution.average / total) * 100 : 0,
        },
        poor: {
          count: distribution.poor,
          percentage: total > 0 ? (distribution.poor / total) * 100 : 0,
        },
      };

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get time analysis
router.get("/tests/:testId/time-analysis", auth, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "teacher" && role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    const attempts = await TestAttempt.find({ testId: req.params.testId });

    const times = attempts.map((a) => a.actualTimeSpent / 60); // convert to minutes

    const analysis = {
      averageTimePerTest: times.reduce((a, b) => a + b, 0) / times.length,
      fastestCompletion: Math.min(...times),
      slowestCompletion: Math.max(...times),
      timeDistribution: {
        lessThan5Min: times.filter((t) => t < 5).length,
        fiveToTenMin: times.filter((t) => t >= 5 && t < 10).length,
        tenToFifteenMin: times.filter((t) => t >= 10 && t < 15).length,
        moreThanFifteenMin: times.filter((t) => t >= 15).length,
      },
      averageTimePerQuestion:
        attempts.length > 0
          ? times.reduce((a, b) => a + b, 0) /
            attempts.length /
            (test.questions.length || 1)
          : 0,
    };

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cheating violations report
router.get("/tests/:testId/violations", auth, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "teacher" && role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const violations = await CheatingViolation.find({
      testId: req.params.testId,
    }).populate("studentId", "name email");

    const violationSummary = {
      totalViolations: violations.length,
      studentsWithViolations: new Set(violations.map((v) => v.studentId._id))
        .size,
      violationsByType: {},
      bySeverity: { warning: 0, major: 0, critical: 0 },
    };

    violations.forEach((v) => {
      violationSummary.violationsByType[v.violationType] =
        (violationSummary.violationsByType[v.violationType] || 0) + 1;
      violationSummary.bySeverity[v.severity] += 1;
    });

    const violationDetails = violations.map((v) => ({
      studentId: v.studentId._id,
      studentName: v.studentId.name,
      email: v.studentId.email,
      violationType: v.violationType,
      severity: v.severity,
      violationTime: v.violationTime,
      elapsedTimeFromStart: v.elapsedTimeFromStart,
      reviewed: v.reviewed,
    }));

    res.json({
      summary: violationSummary,
      details: violationDetails,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN ANALYTICS ====================

// Global test analytics
router.get("/analytics/global", auth, async (req, res) => {
  try {
    const { role, schoolId } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const tests = await Test.find({ schoolId });
    const attempts = await TestAttempt.find({
      testId: { $in: tests.map((t) => t._id) },
    });

    const analytics = {
      totalTests: tests.length,
      totalAttempts: attempts.length,
      totalParticipants: new Set(attempts.map((a) => a.studentId)).size,
      averageScore:
        attempts.length > 0
          ? attempts.reduce((sum, a) => sum + a.totalMarksObtained, 0) /
            attempts.length
          : 0,
      passPercentage:
        attempts.length > 0
          ? (attempts.filter((a) => a.passed).length / attempts.length) * 100
          : 0,
      totalViolations: await CheatingViolation.countDocuments({
        testId: { $in: tests.map((t) => t._id) },
      }),
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// School-wise performance
router.get("/analytics/school-wise", auth, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const tests = await Test.find().select("schoolId _id");
    const testIds = tests.map((t) => t._id);
    const attempts = await TestAttempt.find({
      testId: { $in: testIds },
    }).populate("schoolId");

    const schoolWiseData = {};

    attempts.forEach((attempt) => {
      const schoolId = attempt.schoolId || "unknown";
      if (!schoolWiseData[schoolId]) {
        schoolWiseData[schoolId] = {
          schoolId,
          totalAttempts: 0,
          passedAttempts: 0,
          totalParticipants: new Set(),
          totalMarks: 0,
        };
      }

      schoolWiseData[schoolId].totalAttempts += 1;
      schoolWiseData[schoolId].totalParticipants.add(attempt.studentId);
      schoolWiseData[schoolId].totalMarks += attempt.totalMarksObtained;

      if (attempt.passed) {
        schoolWiseData[schoolId].passedAttempts += 1;
      }
    });

    const result = Object.values(schoolWiseData).map((data) => ({
      ...data,
      totalParticipants: data.totalParticipants.size,
      averageScore:
        data.totalAttempts > 0 ? data.totalMarks / data.totalAttempts : 0,
      passPercentage:
        data.totalAttempts > 0
          ? (data.passedAttempts / data.totalAttempts) * 100
          : 0,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Teacher performance
router.get("/analytics/teacher-wise", auth, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const tests = await Test.find().populate("createdBy", "name email");
    const testIds = tests.map((t) => t._id);
    const attempts = await TestAttempt.find({
      testId: { $in: testIds },
    });

    const teacherWiseData = {};

    tests.forEach((test) => {
      const teacherId = test.createdBy._id;
      if (!teacherWiseData[teacherId]) {
        teacherWiseData[teacherId] = {
          teacherId,
          teacherName: test.createdBy.name,
          totalTests: 0,
          totalAttempts: 0,
          testIds: [],
        };
      }

      teacherWiseData[teacherId].totalTests += 1;
      teacherWiseData[teacherId].testIds.push(test._id);
    });

    attempts.forEach((attempt) => {
      const test = tests.find((t) => t._id.equals(attempt.testId));
      if (test && test.createdBy) {
        const teacherId = test.createdBy._id;
        if (teacherWiseData[teacherId]) {
          teacherWiseData[teacherId].totalAttempts += 1;
        }
      }
    });

    const result = Object.values(teacherWiseData);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
