const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    // Basic Information
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
    },
    questionNumber: {
      type: Number,
      default: 1,
    },
    questionText: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },

    // Question Type
    type: {
      type: String,
      enum: [
        "mcq",
        "true-false",
        "fill-blank",
        "descriptive",
        "coding",
        "image-based",
        "match-following",
        "multi-select",
      ],
      required: true,
    },

    // Marks
    marks: {
      type: Number,
      required: true,
      min: 0,
    },
    negativeMarks: {
      type: Number,
      default: 0,
    },

    // MCQ/Multi-Select Options
    options: [
      {
        optionId: String,
        text: String,
        imageUrl: String,
        isCorrect: Boolean,
      },
    ],

    // Match the Following
    matchingPairs: [
      {
        leftId: String,
        leftText: String,
        rightId: String,
        rightText: String,
      },
    ],

    // Fill in the Blanks
    blanks: [
      {
        blankId: String,
        correctAnswer: String,
        acceptableVariations: [String],
        caseSensitive: { type: Boolean, default: false },
      },
    ],

    // Coding Question
    codingConfig: {
      language: String, // python, javascript, etc.
      templateCode: String,
      testCases: [
        {
          input: String,
          expectedOutput: String,
          isHidden: Boolean,
          weight: { type: Number, default: 1 },
        },
      ],
      timeLimit: { type: Number, default: 30 }, // seconds
      memoryLimit: { type: Number, default: 256 }, // MB
      autoEvaluation: { type: Boolean, default: true },
      plagiarismDetection: { type: Boolean, default: false },
    },

    // Image-based Question
    imageData: {
      imageUrl: String,
      hotspots: [
        {
          id: String,
          x: Number,
          y: Number,
          width: Number,
          height: Number,
          correctAnswer: Boolean,
        },
      ],
    },

    // Difficulty & Tags
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    tags: [String],
    topic: String,
    category: String,
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School" },
    classSectionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ClassSection" }],
    active: { type: Boolean, default: true },

    // Analytics
    attemptCount: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 }, // seconds

    // Meta
    createdBy: mongoose.Schema.Types.ObjectId,
    updatedBy: mongoose.Schema.Types.ObjectId,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Question", questionSchema);
