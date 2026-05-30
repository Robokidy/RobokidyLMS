const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

const loadUser = async (req, res, next) => {
  if (!req.user || !req.user.id) return res.status(401).json({ message: "Missing authenticated user" });
  const user = await User.findById(req.user.id).select("role active permissions schoolId classSectionIds").lean();
  if (!user || !user.active) return res.status(403).json({ message: "Account is inactive or unavailable" });
  req.authUser = user;
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  const role = req.authUser?.role || req.user?.role;
  if (!roles.includes(role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

const hasPermission = (user, permissions) => {
  const granted = new Set(user.permissions || []);
  return !permissions.length || permissions.some((permission) => granted.has(permission));
};

const requirePermission = (...permissions) => async (req, res, next) => {
  if (!req.authUser) {
    await loadUser(req, res, next);
    if (!req.authUser) return; // loadUser handled the response
  }
  const user = req.authUser;
  if (user.role === "admin") return next();
  if (hasPermission(user, permissions)) return next();
  return res.status(403).json({ message: "Permission denied" });
};

module.exports = { auth, loadUser, requireRole, requirePermission, hasPermission };
