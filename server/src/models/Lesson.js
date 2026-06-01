const { Schema, model } = require("mongoose");

const lessonSchema = new Schema(
  {
    // Core Content
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    content: { type: String, required: true }, // Rich HTML content
    contentMarkdown: { type: String, default: "" }, // Markdown backup
    
    // Structure & Organization
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    module: { type: String, trim: true, default: "" },
    chapter: { type: String, trim: true, default: "" },
    courseTrackId: { type: Schema.Types.ObjectId, ref: "CourseTrack" },
    order: { type: Number, default: 0 }, // For lesson sequencing

    // Curriculum Items (supporting content)
    examples: [{ 
      code: String, 
      output: String, 
      explanation: String,
      language: String 
    }],
    objectives: [{ type: String }],
    keyPoints: [{ type: String }],
    contentBlocks: [{ type: Schema.Types.Mixed }],
    attachments: [{
      name: String,
      url: String,
      type: String,
      size: Number
    }],
    prerequisites: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
    gradeLevels: [{ type: String, trim: true }],
    images: [{ 
      url: String, 
      caption: String, 
      alt: String 
    }],
    videos: [{ 
      url: String, 
      title: String, 
      duration: Number 
    }],
    attachments: [{
      name: String,
      url: String,
      type: String,
      size: Number
    }],
    
    // Learning Metadata
    duration: { type: Number, default: 30 }, // in minutes
    difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    tags: [{ type: String }],

    // Scope & Permissions
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    classSectionIds: [{ type: Schema.Types.ObjectId, ref: "ClassSection" }],
    gradeLevels: [{ type: String, trim: true }],
    visibility: { 
      type: String, 
      enum: ["private", "teachers", "students", "public"], 
      default: "teachers" 
    },
    unlockType: { type: String, enum: ["immediate", "afterPrevious", "onDate", "afterAssessment", "teacherApproval"], default: "immediate" },
    unlockDate: { type: Date },
    unlockAfterLessonIds: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
    unlockAfterAssessmentId: { type: Schema.Types.ObjectId, ref: "Assignment" },
    unlockRequiresApproval: { type: Boolean, default: false },
    thumbnailUrl: { type: String, trim: true, default: "" },
    bannerUrl: { type: String, trim: true, default: "" },
    coverUrl: { type: String, trim: true, default: "" },
    isPublished: { type: Boolean, default: false },
    publishedDate: { type: Date },
    
    // Visibility & Access
    visibility: { 
      type: String, 
      enum: ["private", "teachers", "students", "public"], 
      default: "teachers" 
    },
    accessibleBy: [{ type: Schema.Types.ObjectId, ref: "User" }], // For specific user access
    
    // Associated Content
    quizzes: [{ type: Schema.Types.ObjectId, ref: "Quiz" }],
    assignments: [{ type: Schema.Types.ObjectId, ref: "Assignment" }],
    relatedMaterials: [{ type: Schema.Types.ObjectId, ref: "Material" }],

    // Metadata
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    active: { type: Boolean, default: true },

    // Analytics
    viewCount: { type: Number, default: 0 },
    completionCount: { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 },
    dropOffPoint: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    versionHistory: [{
      version: Number,
      title: String,
      updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
      updatedAt: Date,
      updates: Schema.Types.Mixed
    }]
  },
  { timestamps: true }
);

// Indexes for efficient queries
lessonSchema.index({ courseId: 1, order: 1 });
lessonSchema.index({ schoolId: 1, status: 1 });
lessonSchema.index({ createdBy: 1, status: 1 });
lessonSchema.index({ classSectionIds: 1, status: 1 });
lessonSchema.index({ gradeLevels: 1, status: 1 });
lessonSchema.index({ difficulty: 1, status: 1 });
lessonSchema.index({ title: "text", description: "text", content: "text", "contentBlocks.data": "text" });

module.exports = model("Lesson", lessonSchema);
