const { Schema, model } = require("mongoose");

const assignmentTargetSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["school", "grade", "class", "course", "student"],
      required: true
    },
    refId: { type: Schema.Types.ObjectId },
    label: { type: String, default: "" }
  },
  { _id: false }
);

const materialSchema = new Schema(
  {
    // Basic Info
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    
    // Scope & Organization
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    classSectionIds: [{ type: Schema.Types.ObjectId, ref: "ClassSection" }],
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    courseTrackId: { type: Schema.Types.ObjectId, ref: "CourseTrack" },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson" }, // Link to lesson
    
    // Categorization
    subject: { type: String, default: "" },
    grade: { type: String, default: "" },
    type: { 
      type: String, 
      enum: ["pdf", "video", "audio", "doc", "notes", "image", "worksheet", "presentation", "zip", "code", "book", "other"],
      required: true 
    },
    tags: [{ type: String }],
    
    // File Information
    fileName: { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
    filePath: { type: String, default: "" },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // in bytes
    duration: { type: Number }, // for videos, in seconds
    cloudinaryPublicId: { type: String, default: "", index: true },
    cloudinarySecureUrl: { type: String, default: "" },
    cloudinaryResourceType: { type: String, enum: ["image", "video", "raw"], default: "raw" },
    thumbnailUrl: { type: String, default: "" },
    previewUrl: { type: String, default: "" },
    
    // Metadata
    language: { type: String, enum: ["en", "ta", "both"], default: "en" },
    
    // Access Control & Visibility
    visibility: {
      type: String,
      enum: ["private", "teachers", "students", "public"],
      default: "teachers"
    },
    accessibleBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    assignments: [assignmentTargetSchema],
    
    // Viewer Restrictions
    viewer: {
      disableDownload: { type: Boolean, default: true },
      disablePrint: { type: Boolean, default: true },
      disableCopy: { type: Boolean, default: true },
      watermark: { type: String, default: "LearnPy Secure Viewer" },
      expiresAt: { type: Date } // optional expiration
    },
    
    // Publishing
    isPublished: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    publishedDate: { type: Date },
    
    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdByRole: { type: String, enum: ["admin", "teacher"], default: "admin" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    active: { type: Boolean, default: true },
    
    // Analytics
    downloadCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    uniqueViewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    lastViewedAt: { type: Date },
    rating: { type: Number, min: 0, max: 5, default: 0 }
  },
  { timestamps: true }
);

// Indexes for efficient queries
materialSchema.index({ schoolId: 1, classSectionIds: 1, active: 1 });
materialSchema.index({ courseId: 1, lessonId: 1, active: 1 });
materialSchema.index({ createdBy: 1, active: 1 });
materialSchema.index({ status: 1, active: 1 });
materialSchema.index({ "assignments.type": 1, "assignments.refId": 1 });
materialSchema.index({ title: "text", description: "text" });

module.exports = model("Material", materialSchema);
