const { Schema, model } = require("mongoose");

const progressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    completedLessons: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
    quizAttempts: [
      {
        lessonId: { type: Schema.Types.ObjectId, ref: "Lesson" },
        attempts: { type: Number, default: 0 },
        bestScore: { type: Number, default: 0 },
        lastAttemptScore: { type: Number, default: 0 }
      }
    ],
    codeRunCount: { type: Number, default: 0 },
    practiceSolved: [{ type: Schema.Types.ObjectId, ref: "Problem" }],
    practiceAttempts: [
      {
        problemId: { type: Schema.Types.ObjectId, ref: "Problem" },
        attempts: { type: Number, default: 0 },
        bestScore: { type: Number, default: 0 },
        lastScore: { type: Number, default: 0 }
      }
    ],
    practiceScore: { type: Number, default: 0 },
    practiceStreak: { type: Number, default: 0 },
    lastPracticeAt: Date,
    xp: { type: Number, default: 0 },
    streakCount: { type: Number, default: 0 },
    rank: { type: String, default: "Beginner Builder" },
    attendancePercentage: { type: Number, default: 0 },
    skillLevels: {
      coding: { type: Number, default: 0 },
      robotics: { type: Number, default: 0 },
      ai: { type: Number, default: 0 },
      electronics: { type: Number, default: 0 },
      design: { type: Number, default: 0 },
      teamwork: { type: Number, default: 0 }
    },
    completedProjects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    earnedBadges: [{ type: Schema.Types.ObjectId, ref: "Badge" }],
    earnedCertificates: [{ type: Schema.Types.ObjectId, ref: "Certificate" }],
    materialViews: [
      {
        materialId: { type: Schema.Types.ObjectId, ref: "Material" },
        viewCount: { type: Number, default: 0 },
        lastViewedAt: Date
      }
    ],
    weeklyActivity: [{ date: Date, minutes: Number, xp: Number }]
  },
  { timestamps: true }
);

module.exports = model("StudentProgress", progressSchema);
