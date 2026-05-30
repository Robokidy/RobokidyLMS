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
    
    // Media & Attachments
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
    prerequisites: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
    tags: [{ type: String }],
    
    // Scope & Permissions
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    classSectionIds: [{ type: Schema.Types.ObjectId, ref: "ClassSection" }],
    grade: { type: String, default: "" },
    
    // Publishing & Status
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
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
    rating: { type: Number, min: 0, max: 5, default: 0 }
  },
  { timestamps: true }
);

// Indexes for efficient queries
lessonSchema.index({ courseId: 1, order: 1 });
lessonSchema.index({ schoolId: 1, status: 1 });
lessonSchema.index({ createdBy: 1, status: 1 });
lessonSchema.index({ classSectionIds: 1, status: 1 });
lessonSchema.index({ title: "text", description: "text", content: "text" });

module.exports = model("Lesson", lessonSchema);
