const mongoose = require("mongoose");

const codingSubmissionSchema = new mongoose.Schema(
  {
    // Reference Information
    testAttemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestAttempt",
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },

    // Code Information
    language: {
      type: String,
      enum: ["python", "javascript", "java", "cpp", "c"],
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    previousVersions: [
      {
        code: String,
        submittedAt: Date,
        testResults: [
          {
            testCaseId: String,
            passed: Boolean,
            output: String,
            expectedOutput: String,
            executionTime: Number,
            memory: Number,
          },
        ],
      },
    ],

    // Execution & Testing
    submissionNumber: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: [
        "submitted",
        "compiling",
        "compiled",
        "running",
        "completed",
        "error",
      ],
      default: "submitted",
    },

    // Test Results
    testResults: [
      {
        testCaseId: String,
        passed: Boolean,
        input: String,
        expectedOutput: String,
        actualOutput: String,
        executionTime: Number, // milliseconds
        memory: Number, // MB
        errorMessage: String,
        hidden: Boolean,
      },
    ],

    // Scoring
    totalTestCases: { type: Number, default: 0 },
    passedTestCases: { type: Number, default: 0 },
    testCasePassPercentage: { type: Number, default: 0 },
    marksObtained: { type: Number, default: 0 },

    // Compilation & Runtime Info
    compilationError: String,
    runtimeError: String,
    timeoutError: { type: Boolean, default: false },
    memoryExceeded: { type: Boolean, default: false },

    // Plagiarism Detection
    plagiarismCheck: {
      performed: { type: Boolean, default: false },
      similarity: { type: Number, default: 0 }, // percentage
      similarSubmissions: [
        {
          studentId: mongoose.Schema.Types.ObjectId,
          similarity: Number,
          testAttemptId: mongoose.Schema.Types.ObjectId,
        },
      ],
      plagiarismFlag: { type: Boolean, default: false },
    },

    // Feedback
    teacherFeedback: String,
    optimizationNotes: String,
    timeComplexity: String,
    spaceComplexity: String,

    // Timing
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    evaluatedAt: Date,

    // Execution Environment
    executionEnvironment: {
      cpu: String,
      memory: String,
      timeoutSeconds: { type: Number, default: 5 },
      memoryLimitMB: { type: Number, default: 256 },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CodingSubmission", codingSubmissionSchema);
