const express = require("express");
const router = express.Router();
const Test = require("../models/Test");
const TestAttempt = require("../models/TestAttempt");
const Violation = require("../models/Violation");
const User = require("../models/User");
const School = require("../models/School");
const { auth } = require("../middleware/auth");

// ==================== ADMIN ANALYTICS ====================

// Global test analytics
router.get("/admin/global-analytics", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "ceo") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const query = req.user.role === "admin" ? { schoolId: req.user.schoolId } : {};

    const tests = await Test.find(query);
    const attempts = await TestAttempt.find();
    const violations = await Violation.find();

    const analytics = {
      totalTests: tests.length,
      publishedTests: tests.filter((t) => t.status === "published").length,
      draftTests: tests.filter((t) => t.status === "draft").length,
      totalAttempts: attempts.length,
      totalStudents: new Set(attempts.map((a) => a.studentId)).size,
      averageScoreOverall:
        attempts.length > 0
          ? attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length
          : 0,
      passRate:
        attempts.length > 0
          ? (attempts.filter((a) => a.passed).length / attempts.length) * 100
          : 0,
      totalViolations: violations.length,
      violationsPerStudent:
        attempts.length > 0
          ? violations.length / new Set(attempts.map((a) => a.studentId)).size
          : 0,
      averageTestDuration:
        attempts.length > 0
          ? attempts.reduce((sum, a) => sum + a.actualTimeSpent, 0) /
            attempts.length
          : 0,
      completionRate:
        attempts.length > 0
          ? (attempts.filter((a) => a.status === "submitted").length /
              attempts.length) *
            100
          : 0,
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// School-wise performance
router.get("/admin/school-analytics", auth, async (req, res) => {
  try {
    if (req.user.role !== "ceo") {
      return res.status(403).json({ error: "Only CEO can access this" });
    }

    const schools = await School.find();
    const schoolAnalytics = [];

    for (const school of schools) {
      const tests = await Test.find({ schoolId: school._id });
      const attempts = await TestAttempt.find({ schoolId: school._id });

      schoolAnalytics.push({
        schoolId: school._id,
        schoolName: school.name,
        totalTests: tests.length,
        totalAttempts: attempts.length,
        averageScore:
          attempts.length > 0
            ? attempts.reduce((sum, a) => sum + a.percentage, 0) /
              attempts.length
            : 0,
        passRate:
          attempts.length > 0
            ? (attempts.filter((a) => a.passed).length / attempts.length) * 100
            : 0,
        totalStudents: new Set(attempts.map((a) => a.studentId)).size,
        teachers: new Set(tests.map((t) => t.createdBy)).size,
      });
    }

    // Sort by average score
    schoolAnalytics.sort((a, b) => b.averageScore - a.averageScore);

    res.json(schoolAnalytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Teacher-wise performance
router.get("/admin/teacher-analytics", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "ceo") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const query = req.user.role === "admin" ? { schoolId: req.user.schoolId } : {};

    const teachers = await User.find({
      role: "teacher",
      ...query,
    });

    const teacherAnalytics = [];

    for (const teacher of teachers) {
      const tests = await Test.find({ createdBy: teacher._id });
      const testIds = tests.map((t) => t._id);
      const attempts = await TestAttempt.find({ testId: { $in: testIds } });

      teacherAnalytics.push({
        teacherId: teacher._id,
        teacherName: teacher.name,
        email: teacher.email,
        totalTests: tests.length,
        publishedTests: tests.filter((t) => t.status === "published").length,
        totalStudentAttempts: attempts.length,
        averageStudentScore:
          attempts.length > 0
            ? attempts.reduce((sum, a) => sum + a.percentage, 0) /
              attempts.length
            : 0,
        passRate:
          attempts.length > 0
            ? (attempts.filter((a) => a.passed).length / attempts.length) * 100
            : 0,
        uniqueStudents: new Set(attempts.map((a) => a.studentId)).size,
      });
    }

    // Sort by number of tests
    teacherAnalytics.sort((a, b) => b.totalTests - a.totalTests);

    res.json(teacherAnalytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Student rankings
router.get("/admin/student-rankings", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "ceo") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const query = req.user.role === "admin" ? { schoolId: req.user.schoolId } : {};

    const attempts = await TestAttempt.find(query)
      .populate("studentId", "name email")
      .sort({ totalMarksObtained: -1 });

    // Group by student
    const studentScores = {};
    const studentNames = {};

    attempts.forEach((attempt) => {
      const studentId = attempt.studentId._id.toString();
      studentNames[studentId] = attempt.studentId.name;

      if (!studentScores[studentId]) {
        studentScores[studentId] = {
          totalScore: 0,
          totalMarks: 0,
          attempts: 0,
          testsPassed: 0,
        };
      }

      studentScores[studentId].totalScore += attempt.totalMarksObtained;
      studentScores[studentId].totalMarks += attempt.totalMarks;
      studentScores[studentId].attempts++;
      if (attempt.passed) {
        studentScores[studentId].testsPassed++;
      }
    });

    const rankings = Object.entries(studentScores)
      .map(([studentId, scores]) => ({
        studentId,
        studentName: studentNames[studentId],
        averageScore: scores.totalScore / scores.attempts,
        totalAttempts: scores.attempts,
        testsPassed: scores.testsPassed,
        overallPercentage:
          scores.totalMarks > 0
            ? (scores.totalScore / scores.totalMarks) * 100
            : 0,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    // Add ranking
    const rankedResults = rankings.map((student, index) => ({
      ...student,
      rank: index + 1,
    }));

    res.json(rankedResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cheating violations analytics
router.get("/admin/violations-analytics", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "ceo") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const query = req.user.role === "admin" ? { schoolId: req.user.schoolId } : {};

    const violations = await Violation.find(query)
      .populate("studentId", "name email")
      .populate("testId", "title");

    // Aggregate violations by type
    const violationTypes = {};
    const violationsBySeverity = {
      warning: 0,
      moderate: 0,
      severe: 0,
    };
    const violationsByStudent = {};

    violations.forEach((v) => {
      // By type
      violationTypes[v.violationType] = (violationTypes[v.violationType] || 0) + 1;

      // By severity
      violationsBySeverity[v.severity]++;

      // By student
      const studentId = v.studentId._id.toString();
      if (!violationsByStudent[studentId]) {
        violationsByStudent[studentId] = {
          studentId,
          studentName: v.studentId.name,
          email: v.studentId.email,
          totalViolations: 0,
          violations: [],
        };
      }
      violationsByStudent[studentId].totalViolations++;
      violationsByStudent[studentId].violations.push({
        type: v.violationType,
        severity: v.severity,
        timestamp: v.timestamp,
      });
    });

    // Top violators
    const topViolators = Object.values(violationsByStudent)
      .sort((a, b) => b.totalViolations - a.totalViolations)
      .slice(0, 10);

    res.json({
      totalViolations: violations.length,
      violationTypes,
      violationsBySeverity,
      topViolators,
      allViolations: violations,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Performance distribution
router.get("/admin/performance-distribution", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "ceo") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const query = req.user.role === "admin" ? { schoolId: req.user.schoolId } : {};

    const attempts = await TestAttempt.find(query);

    const distribution = {
      "0-20": 0,
      "21-40": 0,
      "41-60": 0,
      "61-80": 0,
      "81-100": 0,
    };

    const gradeDistribution = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    attempts.forEach((attempt) => {
      const percentage = attempt.percentage;

      // Score range
      if (percentage <= 20) distribution["0-20"]++;
      else if (percentage <= 40) distribution["21-40"]++;
      else if (percentage <= 60) distribution["41-60"]++;
      else if (percentage <= 80) distribution["61-80"]++;
      else distribution["81-100"]++;

      // Grades
      if (percentage >= 90) gradeDistribution.A++;
      else if (percentage >= 80) gradeDistribution.B++;
      else if (percentage >= 70) gradeDistribution.C++;
      else if (percentage >= 60) gradeDistribution.D++;
      else gradeDistribution.F++;
    });

    res.json({
      scoreDistribution: distribution,
      gradeDistribution,
      totalAttempts: attempts.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Time analysis
router.get("/admin/time-analytics", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "ceo") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const query = req.user.role === "admin" ? { schoolId: req.user.schoolId } : {};

    const attempts = await TestAttempt.find(query).populate("testId", "timeLimit");

    const timeAnalysis = {
      averageTimeSpent: 0,
      averageTimePerQuestion: 0,
      studentsCompletingOnTime: 0,
      studentsExceedingTime: 0,
      totalAttempts: attempts.length,
      timeDistribution: {
        "0-25%": 0,
        "26-50%": 0,
        "51-75%": 0,
        "76-100%": 0,
        ">100%": 0,
      },
    };

    let totalTimeSpent = 0;
    let totalTimePerQuestion = 0;

    attempts.forEach((attempt) => {
      totalTimeSpent += attempt.actualTimeSpent || 0;
      totalTimePerQuestion += attempt.averageTimePerQuestion || 0;

      const timeLimit = attempt.testId.timeLimit * 60; // Convert to seconds
      const timeUsagePercentage =
        timeLimit > 0 ? (attempt.actualTimeSpent / timeLimit) * 100 : 0;

      if (timeUsagePercentage <= 25) {
        timeAnalysis.timeDistribution["0-25%"]++;
      } else if (timeUsagePercentage <= 50) {
        timeAnalysis.timeDistribution["26-50%"]++;
      } else if (timeUsagePercentage <= 75) {
        timeAnalysis.timeDistribution["51-75%"]++;
      } else if (timeUsagePercentage <= 100) {
        timeAnalysis.timeDistribution["76-100%"]++;
        timeAnalysis.studentsCompletingOnTime++;
      } else {
        timeAnalysis.timeDistribution[">100%"]++;
        timeAnalysis.studentsExceedingTime++;
      }
    });

    if (attempts.length > 0) {
      timeAnalysis.averageTimeSpent = totalTimeSpent / attempts.length;
      timeAnalysis.averageTimePerQuestion = totalTimePerQuestion / attempts.length;
    }

    res.json(timeAnalysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
