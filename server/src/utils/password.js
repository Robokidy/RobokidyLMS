const crypto = require("crypto");

const DEFAULT_FIRST_PASSWORD = "Robokidy@123";
const generateTempPassword = () => crypto.randomBytes(6).toString("base64url");

module.exports = { DEFAULT_FIRST_PASSWORD, generateTempPassword };
