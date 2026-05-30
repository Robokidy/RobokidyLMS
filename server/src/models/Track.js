const { Schema, model } = require("mongoose");

const resourceSchema = new Schema(
  {
    type: { type: String, enum: ["video", "pdf", "diagram", "code", "simulation", "link"], required: true },
    title: { type: String, required: true, trim: true },
    url: { type: String, default: "" }
  },
  { _id: false }
);

const lessonNodeSchema = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson" },
    title: { type: String, required: true, trim: true },
    xpReward: { type: Number, default: 0 },
    locked: { type: Boolean, default: false },
    resources: [resourceSchema]
  },
  { _id: true }
);

const chapterSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    lessons: [lessonNodeSchema],
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    assessmentId: { type: Schema.Types.ObjectId, ref: "Assessment" }
  },
  { _id: true }
);

const moduleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    order: { type: Number, default: 0 },
    chapters: [chapterSchema]
  },
  { _id: true }
);

const trackSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "book-open" },
    color: { type: String, default: "#0891b2" },
    modules: [moduleSchema],
    prerequisites: [{ type: Schema.Types.ObjectId, ref: "Track" }],
    certificateId: { type: Schema.Types.ObjectId, ref: "Certificate" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = model("Track", trackSchema);
