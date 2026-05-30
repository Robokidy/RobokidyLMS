const { Schema, model } = require("mongoose");

const submissionSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedAt: { type: Date, default: Date.now },
    fileUrl: { type: String, default: "" },
    answerText: { type: String, default: "" },
    marks: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    feedback: { type: String, default: "" },
    gradedAt: { type: Date },
    status: { type: String, enum: ["submitted", "graded", "returned", "late"], default: "submitted" },
    isLate: { type: Boolean, default: false },
    attachments: [{
      name: String,
      url: String,
      type: String
    }]
  },
  { _id: true }
);

const assignmentSchema = new Schema(
  {
    // Basic Info
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    instructions: { type: String, default: "" }, // Rich HTML/Markdown
    
    // Scope & Organization
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    classSectionIds: [{ type: Schema.Types.ObjectId, ref: "ClassSection" }],
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    courseTrackId: { type: Schema.Types.ObjectId, ref: "CourseTrack" },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson" }, // Link to lesson
    
    // Content & Type
    type: { type: String, enum: ["submission", "quiz", "project", "discussion"], default: "submission" },
    attachments: [{
      name: String,
      url: String,
      type: String
    }],
    
    // Grading
    maxMarks: { type: Number, default: 100 },
    rubric: [{
      criterion: String,
      weight: Number,
      maxPoints: Number
    }],
    
    // Dates
    dueDate: { type: Date, required: true },
    publishedDate: { type: Date },
    closedDate: { type: Date },
    gracePeriod: { type: Number, default: 0 }, // in hours
    
    // Visibility & Access
    visibility: { type: String, enum: ["teachers", "students"], default: "students" },
    allowLateSubmission: { type: Boolean, default: false },
    allowResubmission: { type: Boolean, default: false },
    
    // Submissions
    submissions: [submissionSchema],
    
    // Publishing
    status: { type: String, enum: ["draft", "published", "closed"], default: "draft" },
    isPublished: { type: Boolean, default: false },
    
    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    active: { type: Boolean, default: true },
    
    // Analytics
    submissionCount: { type: Number, default: 0 },
    gradeCount: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

assignmentSchema.index({ schoolId: 1, classSectionIds: 1, dueDate: 1 });
assignmentSchema.index({ courseId: 1, lessonId: 1, active: 1 });
assignmentSchema.index({ createdBy: 1, status: 1 });

module.exports = model("Assignment", assignmentSchema);
