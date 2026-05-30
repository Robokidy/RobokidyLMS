const mongoose = require("mongoose");

const testAssignmentSchema = new mongoose.Schema(
  {
    // Reference Information
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    schoolId: mongoose.Schema.Types.ObjectId,
    courseTrackId: mongoose.Schema.Types.ObjectId,

    // Assignment Scope
    assignmentType: {
      type: String,
      enum: [
        "individual-student",
        "class",
        "section",
        "grade",
        "school",
        "course-track",
      ],
      required: true,
    },

    // Assigned To
    assignedTo: {
      studentIds: [mongoose.Schema.Types.ObjectId],
      classIds: [mongoose.Schema.Types.ObjectId],
      sectionIds: [mongoose.Schema.Types.ObjectId],
      grades: [String],
      schoolIds: [mongoose.Schema.Types.ObjectId],
      courseTrackIds: [mongoose.Schema.Types.ObjectId],
    },

    // Assignment Timeline
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    startDateTime: Date,
    endDateTime: Date,
    submissionDeadline: Date,

    // Instructions & Notes
    instructions: String,
    additionalNotes: String,

    // Tracking
    totalAssigned: { type: Number, default: 0 },
    totalAttempted: { type: Number, default: 0 },
    totalSubmitted: { type: Number, default: 0 },
    totalPassed: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 },

    // Status
    status: {
      type: String,
      enum: [
        "scheduled",
        "active",
        "paused",
        "closed",
        "archived",
        "cancelled",
      ],
      default: "scheduled",
    },

    // Settings
    settings: {
      allowLateSubmission: { type: Boolean, default: false },
      lateSubmissionPenalty: { type: Number, default: 0 }, // percentage
      showAnswerKey: { type: Boolean, default: false },
      showAnswerKeyAfter: Date,
      allowReAttempt: { type: Boolean, default: false },
      maxRetestAttempts: { type: Number, default: 1 },
      retestGapDays: { type: Number, default: 7 },
      autoGrade: { type: Boolean, default: true },
      notifyOnSubmission: { type: Boolean, default: true },
    },

    // Notifications
    notificationsSent: {
      assignment: { type: Boolean, default: false },
      reminder1: { type: Boolean, default: false },
      reminder2: { type: Boolean, default: false },
      closed: { type: Boolean, default: false },
    },

    // Student Tracking
    studentProgress: [
      {
        studentId: mongoose.Schema.Types.ObjectId,
        studentName: String,
        email: String,
        classId: mongoose.Schema.Types.ObjectId,
        sectionId: mongoose.Schema.Types.ObjectId,
        status: {
          type: String,
          enum: [
            "not-started",
            "in-progress",
            "submitted",
            "graded",
            "missing",
          ],
          default: "not-started",
        },
        submittedAt: Date,
        score: Number,
        percentage: Number,
        passed: Boolean,
        lastAccessedAt: Date,
        violationCount: { type: Number, default: 0 },
        attempts: { type: Number, default: 0 },
      },
    ],

    // Bulk Action History
    bulkActions: [
      {
        action: String, // extend-deadline, close-test, send-reminder, grade-all
        performedBy: mongoose.Schema.Types.ObjectId,
        performedAt: Date,
        affectedStudents: Number,
        notes: String,
      },
    ],

    // Metadata
    tags: [String],
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TestAssignment", testAssignmentSchema);
