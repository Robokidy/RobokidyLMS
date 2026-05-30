const express = require("express");
const { auth, loadUser, requirePermission } = require("../middleware/auth");
const CourseTrack = require("../models/CourseTrack");
const Course = require("../models/Course");

const router = express.Router();
router.use(auth);

function toSlug(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function syncCourseForTrack(track) {
  if (!track || !track.trackCode) return;
  const slug = toSlug(track.trackCode || track.trackName);
  const coursePatch = {
    name: track.trackName,
    slug,
    description: track.description || "",
    trackType: track.category || slug,
    active: track.active !== false
  };
  const existing = await Course.findOne({ slug });
  if (existing) {
    await Course.findByIdAndUpdate(existing._id, coursePatch, { new: true });
    return existing._id;
  }
  const created = await Course.create(coursePatch);
  return created._id;
}

router.get("/", async (req, res) => {
  const filter = { active: true };
  if (req.query.status === "inactive") filter.active = false;
  const tracks = await CourseTrack.find(filter).sort({ trackName: 1 }).lean();
  res.json(tracks);
});

router.post("/", loadUser, requirePermission("classes:manage", "materials"), async (req, res) => {
  const trackName = String(req.body.trackName || "").trim();
  const trackCode = String(req.body.trackCode || trackName).trim();
  if (!trackName || !trackCode) return res.status(400).json({ message: "Track name and code are required" });

  const existing = await CourseTrack.findOne({ trackCode: trackCode.toLowerCase() });
  if (existing) return res.status(409).json({ message: "A track with this code already exists" });

  const track = await CourseTrack.create({
    trackName,
    trackCode: trackCode.toLowerCase(),
    description: String(req.body.description || "").trim(),
    category: String(req.body.category || "general").trim(),
    grade: String(req.body.grade || "").trim(),
    icon: String(req.body.icon || "").trim(),
    status: req.body.status === "inactive" ? "inactive" : "active",
    createdBy: req.user.id,
    active: req.body.status !== "inactive"
  });
  await syncCourseForTrack(track);
  res.status(201).json(track);
});

router.put("/:id", loadUser, requirePermission("classes:manage", "materials"), async (req, res) => {
  const patch = {
    trackName: String(req.body.trackName || "").trim(),
    trackCode: String(req.body.trackCode || "").trim().toLowerCase(),
    description: String(req.body.description || "").trim(),
    category: String(req.body.category || "").trim(),
    grade: String(req.body.grade || "").trim(),
    icon: String(req.body.icon || "").trim(),
    status: req.body.status === "inactive" ? "inactive" : "active",
    active: req.body.status !== "inactive"
  };
  if (!patch.trackName || !patch.trackCode) return res.status(400).json({ message: "Track name and code are required" });

  const track = await CourseTrack.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!track) return res.status(404).json({ message: "Course track not found" });
  await syncCourseForTrack(track);
  res.json(track);
});

router.delete("/:id", loadUser, requirePermission("classes:manage", "materials"), async (req, res) => {
  const track = await CourseTrack.findByIdAndUpdate(req.params.id, { status: "inactive", active: false }, { new: true });
  if (!track) return res.status(404).json({ message: "Course track not found" });
  const slug = toSlug(track.trackCode || track.trackName);
  await Course.findOneAndUpdate({ slug }, { active: false });
  res.json({ message: "Course track removed" });
});

module.exports = router;
