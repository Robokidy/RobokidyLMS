const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const QRCode = require("qrcode");
const { format } = require("date-fns");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const stream = require("stream");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

function hasCloudinary() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

async function fetchBytes(url) {
  const response = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
  return Buffer.from(response.data);
}

async function createFallbackTemplate() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawRectangle({ x: 28, y: 28, width: 785, height: 539, borderWidth: 3, borderColor: rgb(0.79, 0.64, 0.15) });
  page.drawRectangle({ x: 42, y: 42, width: 757, height: 511, borderWidth: 1, borderColor: rgb(0.79, 0.64, 0.15) });
  page.drawText("ROBOKIDY CERTIFICATE", { x: 265, y: 500, size: 26, font: helveticaBold, color: rgb(0.1, 0.1, 0.18) });
  page.drawText("Certificate of Completion", { x: 310, y: 462, size: 18, font: helvetica, color: rgb(0.35, 0.35, 0.35) });
  page.drawText("Authorized Signature", { x: 360, y: 125, size: 12, font: helvetica, color: rgb(0.35, 0.35, 0.35) });
  page.drawLine({ start: { x: 320, y: 145 }, end: { x: 520, y: 145 }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
  return pdfDoc.save();
}

async function loadTemplateBytes() {
  let templateUrl = process.env.CERTIFICATE_TEMPLATE_URL;
  if (!templateUrl) {
    try {
      const CertificateTemplate = require("../models/CertificateTemplate");
      const activeTemplate = await CertificateTemplate.findOne({ active: true }).select("fileUrl").lean();
      templateUrl = activeTemplate?.fileUrl || "";
    } catch {
      templateUrl = "";
    }
  }
  if (templateUrl) {
    try {
      return await fetchBytes(templateUrl);
    } catch (error) {
      console.warn("Certificate template load failed, trying local template:", error.message);
    }
  }
  const localPath = path.resolve(__dirname, "../../../public/certificate-template.pdf");
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }
  return createFallbackTemplate();
}

async function embedSchoolLogo(pdfDoc, page, schoolLogoUrl) {
  if (!schoolLogoUrl) return;
  try {
    let logoBytes = await fetchBytes(schoolLogoUrl);
    if (logoBytes.length > 250000) {
      logoBytes = await sharp(logoBytes).resize({ width: 240, height: 240, fit: "inside" }).png().toBuffer();
    }
    let logoImage;
    try {
      logoImage = await pdfDoc.embedPng(logoBytes);
    } catch {
      logoImage = await pdfDoc.embedJpg(logoBytes);
    }
    page.drawImage(logoImage, { x: 55, y: 500, width: 75, height: 75 });
  } catch (error) {
    console.warn("School logo embed skipped:", error.message);
  }
}

async function generateQRDataUrl(verificationUrl) {
  return QRCode.toDataURL(verificationUrl, { width: 220, margin: 1, errorCorrectionLevel: "H" });
}

async function generateCertificatePDF(data) {
  const templateBytes = await loadTemplateBytes();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const { width } = page.getSize();
  const timesRomanBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const studentName = String(data.studentName || "Student").trim();
  const courseName = String(data.courseName || "Robokidy Program").trim();
  const nameSize = studentName.length > 28 ? 30 : 36;
  const nameWidth = timesRomanBoldItalic.widthOfTextAtSize(studentName, nameSize);
  page.drawText(studentName, {
    x: (width / 2) - (nameWidth / 2),
    y: 310,
    size: nameSize,
    font: timesRomanBoldItalic,
    color: rgb(0.1, 0.1, 0.1)
  });
  const bodyText = `Has successfully completed Grade ${data.grade} - ${courseName}`;
  const bodyText2 = `conducted by Robokidy Education during the Academic Year ${data.academicYear}`;
  page.drawText(bodyText, {
    x: (width / 2) - (timesRoman.widthOfTextAtSize(bodyText, 14) / 2),
    y: 270,
    size: 14,
    font: timesRoman,
    color: rgb(0.2, 0.2, 0.2)
  });
  page.drawText(bodyText2, {
    x: (width / 2) - (timesRoman.widthOfTextAtSize(bodyText2, 12) / 2),
    y: 248,
    size: 12,
    font: timesRoman,
    color: rgb(0.3, 0.3, 0.3)
  });
  page.drawText(`Certificate ID: ${data.certificateId}`, { x: 60, y: 65, size: 9, font: helvetica, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(`Date: ${format(new Date(data.issueDate), "dd-MM-yyyy")}`, { x: width - 180, y: 65, size: 9, font: helvetica, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(`Roll No: ${data.rollNumber || "N/A"}`, { x: width - 180, y: 48, size: 8, font: helvetica, color: rgb(0.45, 0.45, 0.45) });
  const qrDataUrl = await generateQRDataUrl(data.verificationUrl);
  const qrImage = await pdfDoc.embedPng(Buffer.from(qrDataUrl.split(",")[1], "base64"));
  page.drawImage(qrImage, { x: 55, y: 85, width: 96, height: 96 });
  page.drawText("Scan to Verify", { x: 62, y: 74, size: 7, font: helveticaBold, color: rgb(0.45, 0.45, 0.45) });
  await embedSchoolLogo(pdfDoc, page, data.schoolLogoUrl);
  return { pdfBytes: await pdfDoc.save(), qrDataUrl };
}

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    const bufferStream = new stream.PassThrough();
    bufferStream.end(Buffer.from(buffer));
    bufferStream.pipe(uploadStream);
  });
}

async function uploadCertificateToCloudinary(pdfBytes, certificateId, schoolCode, academicYear, studentName = "") {
  if (!hasCloudinary()) throw new Error("Cloudinary credentials are not configured");
  const cleanName = String(studentName || "Student").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  const result = await uploadBuffer(pdfBytes, {
    resource_type: "raw",
    folder: `robokidy-lms/certificates/${schoolCode}/${academicYear}`,
    public_id: `${cleanName}_${certificateId}`,
    format: "pdf",
    overwrite: true
  });
  return result.secure_url;
}

async function uploadQRToCloudinary(qrDataUrl, certificateId, schoolCode) {
  if (!hasCloudinary()) throw new Error("Cloudinary credentials are not configured");
  const result = await cloudinary.uploader.upload(qrDataUrl, {
    folder: `robokidy-lms/certificates/qr-codes/${schoolCode}`,
    public_id: `qr-${certificateId}`,
    overwrite: true
  });
  return result.secure_url;
}

module.exports = {
  generateCertificatePDF,
  generateQRDataUrl,
  uploadCertificateToCloudinary,
  uploadQRToCloudinary
};
