const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Determine Cloudinary folder from mime type
 */
function getFolderFromMime(mimeType = "") {
  if (mimeType === "application/pdf") return "robokidy-lms/materials/pdf";
  if (mimeType.startsWith("video/")) return "robokidy-lms/lessons/videos";
  if (mimeType.startsWith("image/")) return "robokidy-lms/lessons/images";
  if (mimeType.startsWith("audio/")) return "robokidy-lms/lessons/attachments";
  if (
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) return "robokidy-lms/materials/presentations";
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "text/plain"
  ) return "robokidy-lms/materials/worksheets";
  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") {
    return "robokidy-lms/materials/reference-materials";
  }
  return "robokidy-lms/materials/reference-materials";
}

/**
 * Determine Cloudinary resource_type from mime type
 */
function getResourceType(mimeType = "") {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  return "raw"; // PDFs, docs, zips etc. go as "raw"
}

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - MIME type of the file
 * @param {string} originalName - Original filename for display
 * @returns {Promise<object>} Cloudinary upload result
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uploadStreamOnce(buffer, mimeType, originalName) {
  const folder = getFolderFromMime(mimeType);
  const resourceType = getResourceType(mimeType);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        tags: ["robokidy-lms", "material"]
      },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

async function uploadFile(buffer, mimeType, originalName, options = {}) {
  const maxAttempts = options.maxAttempts || 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await uploadStreamOnce(buffer, mimeType, originalName);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await wait(750 * attempt);
      }
    }
  }

  throw lastError;
}

async function replaceFile(oldPublicId, oldResourceType, buffer, mimeType, originalName) {
  const result = await uploadFile(buffer, mimeType, originalName);
  if (oldPublicId) await deleteFile(oldPublicId, oldResourceType || "raw");
  return result;
}

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - 'image' | 'video' | 'raw'
 */
async function deleteFile(publicId, resourceType = "raw") {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
    // Don't throw — deleting a non-existent file should not break the app
  }
}

/**
 * Generate a signed (time-limited) URL for secure student access
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - 'image' | 'video' | 'raw'
 * @param {number} expiresInSeconds - expiry time in seconds (default 600 = 10 min)
 * @returns {string} Signed Cloudinary URL
 */
function generateSignedUrl(publicId, resourceType = "raw", expiresInSeconds = 600) {
  const expireAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return cloudinary.utils.private_download_url(publicId, null, {
    resource_type: resourceType,
    expires_at: expireAt,
    attachment: false
  });
}

function generateSecureUrl(publicId, resourceType = "raw", expiresInSeconds = 600) {
  return generateSignedUrl(publicId, resourceType, expiresInSeconds);
}

/**
 * Generate a thumbnail URL (for images and videos)
 * For raw files (PDF, doc), returns null.
 * @param {string} publicId
 * @param {string} resourceType
 */
function generateThumbnailUrl(publicId, resourceType = "raw") {
  if (resourceType === "image") {
    return cloudinary.url(publicId, {
      resource_type: "image",
      width: 400,
      height: 280,
      crop: "fill",
      quality: "auto",
      fetch_format: "auto"
    });
  }
  if (resourceType === "video") {
    return cloudinary.url(publicId, {
      resource_type: "video",
      format: "jpg",
      width: 400,
      height: 280,
      crop: "fill",
      start_offset: "5"
    });
  }
  return null;
}

function generateThumbnail(publicId, resourceType = "raw") {
  return generateThumbnailUrl(publicId, resourceType);
}

/**
 * Get file metadata from Cloudinary
 */
async function getMetadata(publicId, resourceType = "raw") {
  try {
    return await cloudinary.api.resource(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error("Cloudinary metadata error:", error.message);
    return null;
  }
}

module.exports = {
  uploadFile,
  deleteFile,
  replaceFile,
  generateSignedUrl,
  generateSecureUrl,
  generateThumbnailUrl,
  generateThumbnail,
  getResourceType,
  getFolderFromMime,
  getMetadata
};
