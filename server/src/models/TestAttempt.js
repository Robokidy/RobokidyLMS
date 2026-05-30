const mongoose = require("mongoose");

const testAttemptSchema = new mongoose.Schema(
  {
    // Reference Information
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    schoolId: mongoose.Schema.Types.ObjectId,
    classId: mongoose.Schema.Types.ObjectId,
    sectionId: mongoose.Schema.Types.ObjectId,
    courseTrackId: mongoose.Schema.Types.ObjectId,

    // Attempt Tracking
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: [
        "not-started",
        "in-progress",
        "submitted",
        "evaluated",
        "re-evaluation",
      ],
      default: "not-started",
    },

    // Timing
    startTime: Date,
    endTime: Date,
    actualTimeSpent: { type: Number, default: 0 }, // in seconds
    lastActivityTime: Date,

    // Answers
    answers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        questionType: String,
        answer: mongoose.Schema.Types.Mixed, // Can be string, array, object depending on question type
        marksObtained: { type: Number, default: 0 },
        isCorrect: Boolean,
        reviewFlag: { type: Boolean, default: false },
        timeSpent: { type: Number, default: 0 }, // seconds
        attempts: { type: Number, default: 1 },
      },
    ],

    // Scoring
    totalMarksObtained: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    gradings: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        marks: Number,
        feedback: String,
        gradedBy: mongoose.Schema.Types.ObjectId,
        gradedAt: Date,
      },
    ],

    // Evaluation Status
    evaluationStatus: {
      type: String,
      enum: ["pending", "auto-evaluated", "manually-evaluated"],
      default: "pending",
    },
    evaluatedBy: mongoose.Schema.Types.ObjectId,
    evaluatedAt: Date,

    // Anti-Cheating Data
    violations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CheatingViolation",
      },
    ],
    violationCount: { type: Number, default: 0 },
    suspiciousBehavior: { type: Boolean, default: false },
    suspiciousBehaviorNotes: String,

    // Code Submissions (for coding questions)
    codeSubmissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CodingSubmission",
      },
    ],

    // Device & Browser Information
    deviceInfo: {
      userAgent: String,
      ipAddress: String,
      deviceType: String,
      browser: String,
    },

    // Submission Method
    submissionMethod: {
      type: String,
      enum: ["manual", "auto-timeout", "auto-violation-threshold", "connection-lost"],
      default: "manual",
    },
    isAutoSubmitted: { type: Boolean, default: false },

    // Feedback
    teacherFeedback: String,
    teacherRating: { type: Number, min: 1, max: 5 },

    // Analytics
    questionsAttempted: { type: Number, default: 0 },
    questionsSkipped: { type: Number, default: 0 },
    averageTimePerQuestion: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TestAttempt", testAttemptSchema);
