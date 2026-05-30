const { Schema, model } = require("mongoose");

const questionSchema = new Schema({
  question: String,
  questionType: { type: String, enum: ["multiple-choice", "short-answer", "essay"], default: "multiple-choice" },
  options: [String], // for multiple choice
  correctAnswer: { type: Schema.Types.Mixed }, // can be number (index) or string
  explanation: String,
  points: { type: Number, default: 1 },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
  timeLimit: { type: Number } // in seconds, optional
});

const quizSchema = new Schema(
  {
    // Basic Info
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    
    // Association
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    
    // Scope
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    classSectionIds: [{ type: Schema.Types.ObjectId, ref: "ClassSection" }],
    
    // Content
    questions: [questionSchema],
    
    // Configuration
    maxAttempts: { type: Number, default: 1 },
    timeLimit: { type: Number }, // total quiz time in seconds
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showCorrectAnswers: { type: Boolean, default: false },
    immediateReview: { type: Boolean, default: false },
    passingScore: { type: Number, default: 60 }, // percentage
    
    // Publishing
    status: { type: String, enum: ["draft", "published", "closed"], default: "draft" },
    isPublished: { type: Boolean, default: false },
    publishedDate: { type: Date },
    closedDate: { type: Date },
    
    // Visibility
    visibility: { type: String, enum: ["private", "teachers", "students"], default: "teachers" },
    
    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    active: { type: Boolean, default: true },
    
    // Analytics
    totalAttempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Indexes
quizSchema.index({ lessonId: 1, active: 1 });
quizSchema.index({ courseId: 1, status: 1 });
quizSchema.index({ createdBy: 1, active: 1 });

module.exports = model("Quiz", quizSchema);
