const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      default: "",
    },
    instructions: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      default: "General",
    },
    testType: {
      type: String,
      enum: ["quiz", "assignment", "practice", "mock-exam", "coding"],
      default: "quiz",
    },

    // Test Configuration
    totalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    passingMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    timeLimit: {
      type: Number, // in minutes
      default: 30,
      min: 1,
    },
    negativeMarking: {
      enabled: { type: Boolean, default: false },
      marksPerWrongAnswer: { type: Number, default: 0 },
      marksPerBlank: { type: Number, default: 0 },
    },

    // Question Settings
    randomizeQuestionOrder: {
      type: Boolean,
      default: false,
    },
    randomizeOptions: {
      type: Boolean,
      default: false,
    },
    sectionWiseTiming: {
      enabled: { type: Boolean, default: false },
      sections: [
        {
          name: String,
          timeLimit: Number,
        },
      ],
    },

    // Test Publishing & Scheduling
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    startDateTime: Date,
    endDateTime: Date,
    autoSubmitOnTimeout: {
      type: Boolean,
      default: true,
    },
    scheduledPublishing: {
      enabled: { type: Boolean, default: false },
      publishDateTime: Date,
    },

    // Assignments
    assignedTo: {
      schools: [mongoose.Schema.Types.ObjectId],
      classes: [mongoose.Schema.Types.ObjectId],
      grades: [String],
      sections: [mongoose.Schema.Types.ObjectId],
      students: [mongoose.Schema.Types.ObjectId],
      courseTracks: [mongoose.Schema.Types.ObjectId],
    },

    // Retest Configuration
    allowRetest: {
      type: Boolean,
      default: false,
    },
    maxRetestAttempts: {
      type: Number,
      default: 1,
    },
    restestDaysGap: {
      type: Number,
      default: 7,
    },

    // Anti-Cheating Configuration
    antiCheating: {
      enabled: { type: Boolean, default: true },
      fullscreenMode: { type: Boolean, default: true },
      tabSwitchDetection: { type: Boolean, default: true },
      windowBlurDetection: { type: Boolean, default: true },
      copyPasteDetection: { type: Boolean, default: true },
      rightClickDisabled: { type: Boolean, default: true },
      textSelectionDisabled: { type: Boolean, default: true },
      webcamMonitoring: {
        enabled: { type: Boolean, default: false },
        snapshotIntervalSeconds: { type: Number, default: 30 },
        faceDetectionRequired: { type: Boolean, default: false },
      },
      violationThresholds: {
        warningAt: { type: Number, default: 1 },
        autoSubmitAt: { type: Number, default: 3 },
      },
    },

    // Questions
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],

    // Creator Information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    schoolId: mongoose.Schema.Types.ObjectId,
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    classSectionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ClassSection" }],
    grade: String,
    courseTrackId: mongoose.Schema.Types.ObjectId,

    // Analytics
    totalAttempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    passPercentage: { type: Number, default: 0 },

    // Metadata
    tags: [String],
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Test", testSchema);
