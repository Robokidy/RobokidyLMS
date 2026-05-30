const Course = require("../models/Course");
const Lesson = require("../models/Lesson");

const baseCourses = [
  { name: "Python", slug: "python", description: "Beginner coding lessons and quizzes" },
  { name: "LEGO", slug: "lego", description: "Robotics building and logic activities" },
  { name: "Scratch", slug: "scratch", description: "Block coding and creative programming" },
  { name: "Arduino", slug: "arduino", description: "Electronics, sensors, and microcontroller basics" }
];

async function ensureBaseCourses() {
  const courses = [];

  for (const course of baseCourses) {
    const saved = await Course.findOneAndUpdate(
      { slug: course.slug },
      { $setOnInsert: course },
      { upsert: true, new: true }
    );
    courses.push(saved);
  }

  const python = courses.find((course) => course.slug === "python");
  if (python) {
    await Lesson.updateMany({ courseId: { $exists: false } }, { $set: { courseId: python._id } });
    await Lesson.updateMany({ courseId: null }, { $set: { courseId: python._id } });
  }

  return courses;
}

function toSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = { baseCourses, ensureBaseCourses, toSlug };
