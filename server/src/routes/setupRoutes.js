const express = require("express");
const fs = require("fs");
const path = require("path");
const cloudinary = require("../utils/cloudinary");
const CertificateTemplate = require("../models/CertificateTemplate");

const router = express.Router();
const TEMPLATE_PUBLIC_ID = "robokidy-lms/certificate-templates/robokidy-master-template";

function hasCloudinaryEnv() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function baseUrl(req) {
  return (process.env.NEXT_PUBLIC_BASE_URL || process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
}

function ensureSetupToken(req, res) {
  const expected = process.env.SETUP_SECRET_TOKEN;
  if (!expected) {
    res.status(500).json({ error: "SETUP_SECRET_TOKEN is not configured" });
    return false;
  }
  if (req.query.token !== expected) {
    res.status(401).json({ error: "Unauthorized. Pass ?token=YOUR_SETUP_TOKEN" });
    return false;
  }
  return true;
}

router.get("/upload-template", async (req, res) => {
  if (!ensureSetupToken(req, res)) return;
  if (process.env.SETUP_COMPLETE === "true") {
    return res.status(403).json({ message: "Setup already completed. This route is disabled." });
  }
  if (!hasCloudinaryEnv()) {
    return res.status(500).json({
      status: "error",
      message: "Cloudinary environment variables are missing.",
      hint: "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    });
  }

  try {
    try {
      const existing = await cloudinary.api.resource(TEMPLATE_PUBLIC_ID, { resource_type: "raw" });
      await CertificateTemplate.updateMany({}, { active: false });
      await CertificateTemplate.findOneAndUpdate(
        { publicId: existing.public_id },
        {
          name: "Robokidy Master Template",
          version: "v1",
          fileUrl: existing.secure_url,
          publicId: existing.public_id,
          active: true,
          uploadedByName: "setup-route"
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      process.env.CERTIFICATE_TEMPLATE_URL = existing.secure_url;
      return res.json({
        status: "already_exists",
        message: "Template already uploaded. No action taken.",
        url: existing.secure_url,
        instruction: `Add this to your Vercel env:\nCERTIFICATE_TEMPLATE_URL=${existing.secure_url}`
      });
    } catch {
      // Cloudinary throws for missing resources; continue with upload.
    }

    const localPath = path.resolve(__dirname, "../../../public/certificate-template.pdf");
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({
        status: "error",
        message: "public/certificate-template.pdf was not found.",
        expectedPath: localPath
      });
    }

    const result = await cloudinary.uploader.upload(localPath, {
      resource_type: "raw",
      folder: "robokidy-lms/certificate-templates",
      public_id: "robokidy-master-template",
      format: "pdf",
      overwrite: true,
      tags: ["certificate-template", "robokidy", "master"]
    });

    await CertificateTemplate.updateMany({}, { active: false });
    await CertificateTemplate.findOneAndUpdate(
      { publicId: result.public_id },
      {
        name: "Robokidy Master Template",
        version: "v1",
        fileUrl: result.secure_url,
        publicId: result.public_id,
        active: true,
        uploadedByName: "setup-route"
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    process.env.CERTIFICATE_TEMPLATE_URL = result.secure_url;

    res.json({
      status: "success",
      message: "Certificate template uploaded successfully to Cloudinary.",
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      publicTemplateUrl: `${baseUrl(req)}/certificate-template.pdf`,
      instruction: `NEXT STEP: Add this to Vercel ENV:\nCERTIFICATE_TEMPLATE_URL=${result.secure_url}\nThen redeploy your app.`
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Upload failed.",
      error: error.message,
      hint: "Check Cloudinary credentials and confirm public/certificate-template.pdf exists."
    });
  }
});

router.get("/status", async (_req, res) => {
  const checks = {
    cloudinary_cloud_name: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
    cloudinary_api_key: Boolean(process.env.CLOUDINARY_API_KEY),
    cloudinary_api_secret: Boolean(process.env.CLOUDINARY_API_SECRET),
    certificate_template_url: Boolean(process.env.CERTIFICATE_TEMPLATE_URL),
    setup_secret_token: Boolean(process.env.SETUP_SECRET_TOKEN),
    setup_complete: process.env.SETUP_COMPLETE === "true",
    base_url: process.env.NEXT_PUBLIC_BASE_URL || process.env.FRONTEND_URL || "NOT SET",
    local_template_file: fs.existsSync(path.resolve(__dirname, "../../../public/certificate-template.pdf"))
  };

  let certificateTemplateUrl = process.env.CERTIFICATE_TEMPLATE_URL || "";
  if (!certificateTemplateUrl) {
    const activeTemplate = await CertificateTemplate.findOne({ active: true }).select("fileUrl").lean();
    certificateTemplateUrl = activeTemplate?.fileUrl || "";
    checks.certificate_template_url = Boolean(certificateTemplateUrl);
  }

  let templateReachable = false;
  if (certificateTemplateUrl) {
    try {
      const axios = require("axios");
      const response = await axios.head(certificateTemplateUrl, { timeout: 10000 });
      templateReachable = response.status >= 200 && response.status < 400;
    } catch {
      templateReachable = false;
    }
  }

  const ready = checks.cloudinary_cloud_name && checks.cloudinary_api_key && checks.cloudinary_api_secret && checks.certificate_template_url && templateReachable;
  res.json({
    status: ready ? "All systems ready" : "Setup incomplete",
    checks,
    templateReachable,
    certificateTemplateUrl: certificateTemplateUrl || "NOT SET - run /api/setup/upload-template first"
  });
});

module.exports = router;
