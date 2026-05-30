const { Schema, model } = require("mongoose");

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
      enum: ["pdf", "video", "notes", "image", "worksheet", "zip", "code", "book", "other"], 
      required: true 
    },
    tags: [{ type: String }],
    
    // File Information
    fileName: { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
    filePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // in bytes
    duration: { type: Number }, // for videos, in seconds
    
    // Metadata
    language: { type: String, enum: ["en", "ta", "both"], default: "en" },
    
    // Access Control & Visibility
    visibility: {
      type: String,
      enum: ["private", "teachers", "students", "public"],
      default: "teachers"
    },
    accessibleBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    
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
    publishedDate: { type: Date },
    
    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    active: { type: Boolean, default: true },
    
    // Analytics
    downloadCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 }
  },
  { timestamps: true }
);

// Indexes for efficient queries
materialSchema.index({ schoolId: 1, classSectionIds: 1, active: 1 });
materialSchema.index({ courseId: 1, lessonId: 1, active: 1 });
materialSchema.index({ createdBy: 1, active: 1 });
materialSchema.index({ title: "text", description: "text" });

module.exports = model("Material", materialSchema);
