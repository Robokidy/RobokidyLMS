const mongoose = require("mongoose");

const violationSchema = new mongoose.Schema(
  {
    // Reference Information
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    testAttemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestAttempt",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    schoolId: mongoose.Schema.Types.ObjectId,

    // Violation Details
    violationType: {
      type: String,
      enum: [
        "tab-switch",
        "window-blur",
        "window-minimize",
        "copy-attempt",
        "paste-attempt",
        "right-click",
        "keyboard-shortcut",
        "screen-share-detected",
        "multiple-faces",
        "no-face-detected",
        "external-monitor",
        "device-mismatch",
        "unusual-activity",
        "disconnection",
        "browser-devtools",
        "other",
      ],
      required: true,
    },

    // Violation Metadata
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    duration: Number, // in seconds for continuous violations
    description: String,
    details: mongoose.Schema.Types.Mixed, // Flexible field for violation-specific data

    // Severity & Action
    severity: {
      type: String,
      enum: ["warning", "moderate", "severe"],
      default: "warning",
    },
    actionTaken: {
      type: String,
      enum: [
        "warning-shown",
        "blur-screen",
        "auto-submit",
        "none",
        "logged-only",
      ],
      default: "logged-only",
    },

    // Evidence
    evidence: {
      screenshot: String, // URL or base64
      videoClip: String, // URL or path
      deviceInfo: mongoose.Schema.Types.Mixed,
      browserConsole: String,
      networkInfo: mongoose.Schema.Types.Mixed,
    },

    // Violation Count in Session
    violationCountInSession: {
      type: Number,
      default: 1,
    },
    isRepeating: {
      type: Boolean,
      default: false,
    },

    // Resolution
    reviewed: {
      type: Boolean,
      default: false,
    },
    reviewedBy: mongoose.Schema.Types.ObjectId,
    reviewedAt: Date,
    reviewerNotes: String,
    actionDecision: {
      type: String,
      enum: ["dismissed", "warned", "penalized", "flagged-for-review"],
      default: "warned",
    },
    penaltyApplied: {
      type: String,
      enum: ["none", "marks-deducted", "test-cancelled", "account-suspended"],
      default: "none",
    },
    penaltyDetails: mongoose.Schema.Types.Mixed,

    // Status
    status: {
      type: String,
      enum: ["pending", "acknowledged", "resolved", "appealed"],
      default: "pending",
    },
    studentAcknowledged: {
      type: Boolean,
      default: false,
    },
    studentAcknowledgedAt: Date,
    studentResponse: String,

    // Appeal Process
    appealed: {
      type: Boolean,
      default: false,
    },
    appealNotes: String,
    appealReviewedBy: mongoose.Schema.Types.ObjectId,
    appealReviewedAt: Date,
    appealDecision: {
      type: String,
      enum: ["upheld", "overturned", "partially-overturned"],
    },
  },
  { timestamps: true }
);

violationSchema.index({ testAttemptId: 1, timestamp: -1 });
violationSchema.index({ studentId: 1, testId: 1 });
violationSchema.index({ status: 1, reviewed: 1 });

module.exports = mongoose.model("Violation", violationSchema);
