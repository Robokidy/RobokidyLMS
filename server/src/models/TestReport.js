const mongoose = require("mongoose");

const testReportSchema = new mongoose.Schema(
  {
    // Reference Information
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    schoolId: mongoose.Schema.Types.ObjectId,
    courseTrackId: mongoose.Schema.Types.ObjectId,

    // Report Type
    reportType: {
      type: String,
      enum: [
        "student-wise",
        "class-wise",
        "question-wise",
        "topic-wise",
        "comparative",
      ],
      default: "class-wise",
    },

    // For Student-wise Reports
    studentId: mongoose.Schema.Types.ObjectId,
    studentName: String,
    studentEmail: String,

    // For Class-wise Reports
    classId: mongoose.Schema.Types.ObjectId,
    className: String,
    sectionId: mongoose.Schema.Types.ObjectId,
    sectionName: String,

    // Statistics
    statistics: {
      totalAttempts: { type: Number, default: 0 },
      passedAttempts: { type: Number, default: 0 },
      failedAttempts: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      lowestScore: { type: Number, default: 0 },
      totalParticipants: { type: Number, default: 0 },
      passPercentage: { type: Number, default: 0 },
      averagePassMarks: { type: Number, default: 0 },
      averageTimeSpent: { type: Number, default: 0 }, // minutes
      passedStudents: { type: Number, default: 0 },
      failedStudents: { type: Number, default: 0 },
    },

    // Question-wise Analytics
    questionAnalytics: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        questionText: String,
        difficulty: String,
        topic: String,
        totalAttempts: Number,
        correctAttempts: Number,
        accuracy: Number, // percentage
        averageTimeSpent: Number,
        difficulty_index: Number,
        discrimination_index: Number,
      },
    ],

    // Student Performance Data
    studentPerformance: [
      {
        studentId: mongoose.Schema.Types.ObjectId,
        studentName: String,
        email: String,
        score: Number,
        percentage: Number,
        passed: Boolean,
        timeSpent: Number,
        attemptNumber: Number,
        violationCount: Number,
        submittedAt: Date,
      },
    ],

    // Performance Tiers
    performanceTiers: {
      excellent: { count: Number, percentage: Number, minScore: Number }, // > 90%
      good: { count: Number, percentage: Number, minScore: Number }, // 75-90%
      average: { count: Number, percentage: Number, minScore: Number }, // 60-75%
      poor: { count: Number, percentage: Number, minScore: Number }, // < 60%
    },

    // Topic/Weak Area Analysis
    topicAnalysis: [
      {
        topic: String,
        totalQuestions: Number,
        correctAttempts: Number,
        accuracy: Number,
        difficulty: String,
        recommendation: String,
      },
    ],

    // Cheating & Violation Summary
    violationSummary: {
      totalViolations: { type: Number, default: 0 },
      studentsWithViolations: { type: Number, default: 0 },
      violationsByType: mongoose.Schema.Types.Mixed,
      criticalViolations: { type: Number, default: 0 },
    },

    // Time Analysis
    timeAnalysis: {
      averageTimePerQuestion: Number,
      fastestCompletion: Number,
      slowestCompletion: Number,
      timeDistribution: {
        lessThan5Min: Number,
        fiveToTenMin: Number,
        tenToFifteenMin: Number,
        moreThanFifteenMin: Number,
      },
    },

    // Difficulty Analysis
    difficultyAnalysis: {
      easyQuestionAccuracy: Number,
      mediumQuestionAccuracy: Number,
      hardQuestionAccuracy: Number,
    },

    // Generated Data
    generatedBy: mongoose.Schema.Types.ObjectId,
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    reportPeriod: {
      startDate: Date,
      endDate: Date,
    },

    // Export URLs
    pdfUrl: String,
    excelUrl: String,
    lastUpdated: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TestReport", testReportSchema);
