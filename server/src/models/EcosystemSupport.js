const { Schema, model } = require("mongoose");

const aiRecommendationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trackId: { type: Schema.Types.ObjectId, ref: "Track" },
    weakTopic: { type: String, default: "" },
    recommendationType: { type: String, enum: ["lesson", "quiz", "project", "summary", "tutor"], default: "lesson" },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    resolved: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const parentProfileSchema = new Schema(
  {
    parentUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    children: [{ type: Schema.Types.ObjectId, ref: "User" }],
    notificationPreferences: {
      progress: { type: Boolean, default: true },
      attendance: { type: Boolean, default: true },
      certificates: { type: Boolean, default: true },
      teacherComments: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

const teacherCommentSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trackId: { type: Schema.Types.ObjectId, ref: "Track" },
    comment: { type: String, required: true },
    aiAssistedFeedback: { type: String, default: "" },
    visibility: { type: String, enum: ["student", "parent", "admin"], default: "parent" }
  },
  { timestamps: true }
);

const competitionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["hackathon", "robotics", "coding", "innovation"], default: "innovation" },
    registrationOpen: { type: Boolean, default: true },
    startsAt: Date,
    endsAt: Date,
    submissions: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: "User" },
        projectId: { type: Schema.Types.ObjectId, ref: "Project" },
        score: { type: Number, default: 0 },
        status: { type: String, enum: ["draft", "submitted", "reviewed"], default: "draft" }
      }
    ]
  },
  { timestamps: true }
);

module.exports = {
  AIRecommendation: model("AIRecommendation", aiRecommendationSchema),
  ParentProfile: model("ParentProfile", parentProfileSchema),
  TeacherComment: model("TeacherComment", teacherCommentSchema),
  Competition: model("Competition", competitionSchema)
};
