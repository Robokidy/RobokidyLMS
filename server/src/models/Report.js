const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    // Report Metadata
    title: String,
    reportType: {
      type: String,
      enum: [
        "student-performance",
        "test-analytics",
        "class-analytics",
        "question-analysis",
        "school-analytics",
        "teacher-analytics",
        "cheating-violations",
        "custom",
      ],
      required: true,
    },
    description: String,

    // Report Scope
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSection",
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSection",
    },

    // Report Data
    data: {
      // Student Performance Data
      attemptCount: Number,
      totalScore: Number,
      averageScore: Number,
      highestScore: Number,
      lowestScore: Number,
      passPercentage: Number,
      passCount: Number,
      failCount: Number,

      // Time Analysis
      averageTimeSpent: Number, // in seconds
      totalTimeSpent: Number,
      timePerQuestion: Number,
      timeDistribution: [
        {
          range: String,
          count: Number,
        },
      ],

      // Question Analysis
      totalQuestions: Number,
      questionsAttempted: Number,
      questionsSkipped: Number,
      correctAnswers: Number,
      wrongAnswers: Number,
      accuracy: Number, // percentage

      // Question-wise Breakdown
      questionAnalysis: [
        {
          questionId: mongoose.Schema.Types.ObjectId,
          questionText: String,
          correctCount: Number,
          wrongCount: Number,
          skippedCount: Number,
          averageScore: Number,
          difficulty: String,
          topic: String,
          accuracy: Number,
        },
      ],

      // Topic/Tag-wise Analysis
      topicAnalysis: [
        {
          topic: String,
          correctCount: Number,
          totalCount: Number,
          accuracy: Number,
          averageTimeSpent: Number,
        },
      ],

      // Difficulty-wise Analysis
      difficultyAnalysis: {
        easy: {
          count: Number,
          correct: Number,
          accuracy: Number,
        },
        medium: {
          count: Number,
          correct: Number,
          accuracy: Number,
        },
        hard: {
          count: Number,
          correct: Number,
          accuracy: Number,
        },
      },

      // Cheating Analysis
      violationCount: Number,
      violationTypes: [
        {
          type: String,
          count: Number,
        },
      ],
      highestViolationStudent: mongoose.Schema.Types.ObjectId,
      violationTrend: [
        {
          date: Date,
          count: Number,
        },
      ],

      // Class/Batch Analytics
      classMetrics: {
        totalStudents: Number,
        participatingStudents: Number,
        averageScore: Number,
        highestScore: Number,
        lowestScore: Number,
        passPercentage: Number,
        failPercentage: Number,
      },

      // Comparison Data
      studentRanking: [
        {
          rank: Number,
          studentId: mongoose.Schema.Types.ObjectId,
          studentName: String,
          score: Number,
          percentage: Number,
          timeSpent: Number,
          violations: Number,
        },
      ],
      topPerformers: [
        {
          studentId: mongoose.Schema.Types.ObjectId,
          studentName: String,
          score: Number,
          percentage: Number,
        },
      ],
      weakPerformers: [
        {
          studentId: mongoose.Schema.Types.ObjectId,
          studentName: String,
          score: Number,
          percentage: Number,
        },
      ],

      // Performance Trends
      performanceTrend: [
        {
          attemptNumber: Number,
          score: Number,
          date: Date,
          timeSpent: Number,
        },
      ],

      // Distribution Analysis
      scoreDistribution: [
        {
          range: String,
          count: Number,
          percentage: Number,
        },
      ],
      performanceGrade: {
        A: Number,
        B: Number,
        C: Number,
        D: Number,
        F: Number,
      },

      // Engagement Metrics
      engagementIndex: Number, // 0-100
      completionRate: Number, // percentage
      participationRate: Number, // percentage
      averageAttemptTime: Number,
    },

    // Report Generation
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },

    // Report Filters & Criteria
    filters: {
      dateRange: {
        startDate: Date,
        endDate: Date,
      },
      attemptStatus: [String], // submitted, evaluated, etc.
      performanceRange: {
        min: Number,
        max: Number,
      },
      includeViolations: Boolean,
      includeFailed: Boolean,
    },

    // Report Format
    format: {
      type: String,
      enum: ["json", "pdf", "excel", "html"],
      default: "json",
    },
    exported: {
      type: Boolean,
      default: false,
    },
    exportedAt: Date,
    exportedFormat: String,
    exportUrl: String,

    // Visibility
    isPublic: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        role: String,
        sharedAt: Date,
      },
    ],

    // Insights & Recommendations
    insights: {
      keyFindings: [String],
      weakAreas: [String],
      strongAreas: [String],
      improvements: [String],
      recommendations: [String],
      alerts: [String],
    },

    // Status
    status: {
      type: String,
      enum: ["generating", "ready", "archived"],
      default: "ready",
    },
  },
  { timestamps: true }
);

reportSchema.index({ testId: 1, generatedAt: -1 });
reportSchema.index({ studentId: 1, reportType: 1 });
reportSchema.index({ teacherId: 1, status: 1 });
reportSchema.index({ schoolId: 1, reportType: 1 });

module.exports = mongoose.model("Report", reportSchema);
