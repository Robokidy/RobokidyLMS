const { Schema, model } = require("mongoose");

const testResultSchema = new Schema(
  {
    testCaseIndex: { type: Number, required: true },
    input: { type: String, required: true },
    expected: { type: String, required: true },
    output: { type: String, required: true },
    passed: { type: Boolean, required: true },
    timeMs: { type: Number, required: true }
  },
  { _id: false }
);

const submissionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    problemId: { type: Schema.Types.ObjectId, ref: "Problem", required: true },
    code: { type: String, required: true },
    language: { type: String, default: "python" },
    status: { type: String, enum: ["passed", "failed", "partial"], default: "failed" },
    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    executionTimeMs: { type: Number, default: 0 },
    memoryMb: { type: Number, default: 0 },
    plagiarismScore: { type: Number, default: 0 },
    details: [testResultSchema]
  },
  { timestamps: true }
);

module.exports = model("Submission", submissionSchema);
