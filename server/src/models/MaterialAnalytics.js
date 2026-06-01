const { Schema, model } = require("mongoose");

const materialAnalyticsSchema = new Schema(
    {
        materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true },
        studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        schoolId: { type: Schema.Types.ObjectId, ref: "School" },
        classSectionId: { type: Schema.Types.ObjectId, ref: "ClassSection" },
        viewedAt: { type: Date, default: Date.now },
        timeSpent: { type: Number, default: 0 }, // seconds
        completed: { type: Boolean, default: false },
        sessionCount: { type: Number, default: 1 }
    },
    { timestamps: true }
);

materialAnalyticsSchema.index({ materialId: 1, studentId: 1 });
materialAnalyticsSchema.index({ materialId: 1, viewedAt: -1 });
materialAnalyticsSchema.index({ studentId: 1, viewedAt: -1 });

module.exports = model("MaterialAnalytics", materialAnalyticsSchema);
