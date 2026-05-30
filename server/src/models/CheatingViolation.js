const mongoose = require("mongoose");

const cheatingViolationSchema = new mongoose.Schema(
  {
    // Reference Information
    testAttemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestAttempt",
      required: true,
    },
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

    // Violation Details
    violationType: {
      type: String,
      enum: [
        "tab-switch",
        "window-blur",
        "window-minimize",
        "copy-paste",
        "right-click",
        "keyboard-shortcut",
        "text-selection",
        "screen-share",
        "multiple-faces",
        "no-face-detected",
        "suspicious-activity",
        "connection-lost",
        "device-change",
        "unknown",
      ],
      required: true,
    },

    // Violation Count & Severity
    violationCount: {
      type: Number,
      default: 1,
    },
    severity: {
      type: String,
      enum: ["warning", "major", "critical"],
      default: "warning",
    },
    action: {
      type: String,
      enum: [
        "warning",
        "popup-warning",
        "auto-submit",
        "report-only",
        "block-test",
      ],
      default: "warning",
    },

    // Timing
    violationTime: {
      type: Date,
      default: Date.now,
    },
    elapsedTimeFromStart: { type: Number, default: 0 }, // seconds

    // Details
    description: String,
    evidence: {
      screenshotUrl: String,
      videoUrl: String,
      logData: mongoose.Schema.Types.Mixed,
    },

    // System Generated Data
    deviceInfo: {
      ipAddress: String,
      userAgent: String,
      screenResolution: String,
    },

    // Review
    reviewed: { type: Boolean, default: false },
    reviewedBy: mongoose.Schema.Types.ObjectId,
    reviewedAt: Date,
    reviewNotes: String,
    actionTaken: String,

    // Auto-Detection Metadata
    confidenceScore: { type: Number, min: 0, max: 100 }, // How confident the detection is
    automaticallyDetected: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CheatingViolation", cheatingViolationSchema);
