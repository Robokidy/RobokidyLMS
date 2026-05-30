const bcrypt = require("bcryptjs");
const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    username: { type: String, unique: true, required: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "teacher", "student", "parent"], required: true },
    fullName: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    employeeId: { type: String, trim: true, default: "" },
    studentId: { type: String, trim: true, default: "" },
    rollNumber: { type: String, trim: true, default: "" },
    parentName: { type: String, trim: true, default: "" },
    parentContact: { type: String, trim: true, default: "" },
    qualification: { type: String, trim: true, default: "" },
    experience: { type: String, trim: true, default: "" },
    profilePhotoUrl: { type: String, trim: true, default: "" },
    joiningDate: { type: Date },
    salary: { type: Number, min: 0, default: 0 },
    subjects: [{ type: String, trim: true }],
    permissions: [{ type: String, trim: true }],
    grade: { type: String, trim: true, default: "" },
    feeStructure: { type: String, trim: true, default: "" },
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    classSectionIds: [{ type: Schema.Types.ObjectId, ref: "ClassSection" }],
    parentStudentIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    assignedCourses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    assignedTrackIds: [{ type: Schema.Types.ObjectId, ref: "CourseTrack" }],
    // grade removed; use assignedCourses for access control
    firstLogin: { type: Boolean, default: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.pre("save", async function preSave(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.index({ role: 1, schoolId: 1, active: 1 });
userSchema.index({ role: 1, schoolId: 1, classSectionIds: 1 });
userSchema.index({ role: 1, grade: 1, active: 1 });
userSchema.index({ username: "text", fullName: "text", email: "text", studentId: "text", rollNumber: "text" });

module.exports = model("User", userSchema);
