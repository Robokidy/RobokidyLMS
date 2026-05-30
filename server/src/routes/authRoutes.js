const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const StudentProgress = require("../models/StudentProgress");
const ActivityLog = require("../models/ActivityLog");
const { auth } = require("../middleware/auth");
const { ensureUsernameAvailable, generateUniqueUsername } = require("../utils/accounts");

const router = express.Router();

router.get("/username", async (req, res) => {
  const requested = String(req.query.username || "").trim().toLowerCase();
  if (requested) return res.json(await ensureUsernameAvailable(requested));
  const seed = String(req.query.seed || req.query.name || "user").trim();
  const suggested = await generateUniqueUsername(seed);
  res.json({ available: true, username: suggested, suggested });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const user = await User.findOne({ username: normalizedUsername });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
      username: user.username,
      schoolId: user.schoolId,
      classSectionIds: user.classSectionIds || [],
      permissions: user.permissions || []
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  await ActivityLog.create({ userId: user._id, action: "login" });
  res.json({
    token,
    user: {
      id: user._id,
      role: user.role,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      schoolId: user.schoolId,
      classSectionIds: user.classSectionIds || [],
      permissions: user.permissions || [],
      firstLogin: user.firstLogin
    }
  });
});

router.post("/change-password", auth, async (req, res) => {
  const { password, confirmPassword } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ message: "Password must be at least 6 chars" });
  if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.password = password;
  user.firstLogin = false;
  await user.save();

  await StudentProgress.findOneAndUpdate(
    { userId: user._id },
    { $setOnInsert: { userId: user._id } },
    { upsert: true }
  );

  await ActivityLog.create({ userId: user._id, action: "password_changed" });
  res.json({ message: "Password updated" });
});

module.exports = router;
