const { Schema, model } = require("mongoose");

const projectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    thumbnailUrl: { type: String, default: "" },
    timeEstimateMinutes: { type: Number, default: 60 },
    requiredComponents: [{ type: String, trim: true }],
    circuitDiagramUrl: { type: String, default: "" },
    sourceCode: { type: String, default: "" },
    videoDemoUrl: { type: String, default: "" },
    teamSize: { type: Number, default: 1 },
    xpReward: { type: Number, default: 0 },
    rubric: [{ title: String, points: Number }],
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = model("Project", projectSchema);
