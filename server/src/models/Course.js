const { Schema, model } = require("mongoose");

const courseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: "" },
    trackType: {
      type: String,
      enum: ["lego", "arduino", "python", "ai", "iot", "web", "electronics", "app", "design", "drone", "automation", "competition", "certification", "portfolio", "community", "general"],
      default: "general"
    },
    difficulty: { type: String, enum: ["beginner", "intermediate", "advanced", "mixed"], default: "beginner" },
    xpReward: { type: Number, default: 0 },
    certificateTemplate: { type: String, default: "" },
    prerequisites: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = model("Course", courseSchema);
