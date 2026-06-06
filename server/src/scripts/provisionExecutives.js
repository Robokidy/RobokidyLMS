require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

const executives = [
  {
    role: "cto",
    envPrefix: "CTO",
    defaultUsername: "cto",
    defaultFullName: "Chief Technology Officer"
  },
  {
    role: "cmo",
    envPrefix: "CMO",
    defaultUsername: "cmo",
    defaultFullName: "Chief Marketing Officer"
  }
];

const tempPassword = () => crypto.randomBytes(12).toString("base64url");

async function provisionExecutive({ role, envPrefix, defaultUsername, defaultFullName }) {
  const username = (process.env[`${envPrefix}_USERNAME`] || defaultUsername).trim().toLowerCase();
  const email = (process.env[`${envPrefix}_EMAIL`] || "").trim().toLowerCase();
  const password = process.env[`${envPrefix}_PASSWORD`] || tempPassword();

  const identifiers = [{ role }, { username }];
  if (email) identifiers.push({ email });

  let user = await User.findOne({ $or: identifiers });
  const action = user ? "updated" : "created";
  if (!user) user = new User({ role });

  user.username = username;
  user.email = email;
  user.password = password;
  user.role = role;
  user.fullName = user.fullName || defaultFullName;
  user.active = true;
  user.firstLogin = true;

  await user.save();

  return {
    role,
    action,
    username,
    email,
    password
  };
}

(async () => {
  try {
    await connectDB();
    const results = [];

    for (const executive of executives) {
      results.push(await provisionExecutive(executive));
    }

    console.log("Executive accounts provisioned in MongoDB:");
    for (const result of results) {
      console.log(`${result.role.toUpperCase()} ${result.action}`);
      console.log(`  username: ${result.username}`);
      if (result.email) console.log(`  email: ${result.email}`);
      console.log(`  temporary password: ${result.password}`);
    }
    console.log("Both accounts must change password after first login.");
  } catch (error) {
    console.error("Failed to provision executive accounts:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close().catch(() => undefined);
  }
})();
