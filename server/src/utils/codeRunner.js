const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const blockedPatterns = [
  /\bimport\s+os\b/,
  /\bimport\s+subprocess\b/,
  /\bopen\s*\(/,
  /\beval\s*\(/,
  /\bexec\s*\(/,
  /\bsystem\s*\(/,
  /\bsubprocess\./
];

function normalizeOutput(text) {
  return String(text || "").replace(/\r/g, "").trim();
}

function runPythonCode(code, input = "", timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    if (blockedPatterns.some((pattern) => pattern.test(code))) {
      return reject(new Error("Code contains blocked operations"));
    }

    const fileName = `learnpy-${Date.now()}-${Math.round(Math.random() * 10000)}.py`;
    const filePath = path.join(os.tmpdir(), fileName);
    fs.writeFileSync(filePath, code, "utf-8");

    const child = spawn("python", [filePath], { stdio: ["pipe", "pipe", "pipe"], timeout: timeoutMs });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      fs.unlink(filePath, () => {});
      reject(error);
    });

    child.on("close", (code) => {
      fs.unlink(filePath, () => {});
      resolve({
        stdout: normalizeOutput(stdout),
        stderr: normalizeOutput(stderr),
        exitCode: code
      });
    });

    if (input !== undefined && input !== null) {
      child.stdin.write(String(input));
    }
    child.stdin.end();
  });
}

module.exports = {
  runPythonCode,
  blockedPatterns,
  normalizeOutput
};
