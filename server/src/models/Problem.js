const { Schema, model } = require("mongoose");

const sampleSchema = new Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  explanation: { type: String, default: "" },
  visible: { type: Boolean, default: true }
});

const testCaseSchema = new Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  visible: { type: Boolean, default: false }
});

const problemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: "" },
    explanation: { type: String, default: "" },
    constraints: { type: String, default: "" },
    inputFormat: { type: String, default: "" },
    outputFormat: { type: String, default: "" },
    samples: [sampleSchema],
    hints: [{ type: String }],
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "easy" },
    tags: [{ type: String }],
    grade: { type: String, enum: ["grade1", "grade2", "grade3", "grade4", "grade5", "grade6", "grade7", "grade8", "grade9", "grade10"], default: "grade1" },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    timeLimitMs: { type: Number, default: 2000 },
    memoryLimitMb: { type: Number, default: 128 },
    testCases: [testCaseSchema],
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

module.exports = model("Problem", problemSchema);
