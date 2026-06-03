const express = require("express");
const https = require("https");
const multer = require("multer");
const { auth, loadUser } = require("../middleware/auth");
const Material = require("../models/Material");
const MaterialAnalytics = require("../models/MaterialAnalytics");
const User = require("../models/User");
const School = require("../models/School");
const ClassSection = require("../models/ClassSection");
const Course = require("../models/Course");
const {
    uploadFile,
    deleteFile,
    replaceFile,
    generateThumbnailUrl,
    getResourceType
} = require("../utils/cloudinaryService");

const router = express.Router();
router.use(auth, loadUser);

// Multer — store file in memory, then stream to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
    fileFilter(_req, file, cb) {
        const supportedMimeTypes = new Set([
            "application/pdf",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
            "application/zip",
            "application/x-zip-compressed",
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4",
            "video/quicktime",
            "audio/mpeg"
        ]);
        if (supportedMimeTypes.has(file.mimetype)) return cb(null, true);
        cb(new Error("Unsupported file type"));
    }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserScope(user) {
    return {
        userId: user._id,
        role: user.role,
        schoolId: user.schoolId,
        classSectionIds: (user.classSectionIds || []).map(String),
        assignedCourses: (user.assignedCourses || []).map(String)
    };
}

function parseArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== "string") return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
        return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
}

function normalizeAssignments(assignments, scope) {
    const parsed = parseArray(assignments);
    return parsed
        .filter((assignment) => assignment && assignment.type && (assignment.type === "grade" ? assignment.label : assignment.refId))
        .filter((assignment) => {
            if (scope.role === "admin") return true;
            if (assignment.type === "class") return scope.classSectionIds.includes(String(assignment.refId));
            if (assignment.type === "course") return scope.assignedCourses.includes(String(assignment.refId));
            if (assignment.type === "school") return String(assignment.refId) === String(scope.schoolId);
            if (assignment.type === "grade") return true;
            return false;
        })
        .map((assignment) => {
            const normalized = {
                type: assignment.type,
                label: assignment.label || ""
            };
            if (assignment.refId) normalized.refId = assignment.refId;
            return normalized;
        });
}

function canViewMaterial(scope, material) {
    if (scope.role === "admin") return true;
    if (scope.role === "teacher") return true;
    return false;
}

function canEditMaterial(scope, material) {
    if (scope.role === "admin") return true;
    if (scope.role === "teacher") return true;
    return false;
}

function buildListFilter(scope, query) {
    const filter = { active: true };

    if (query.search) filter.$text = { $search: query.search };
    if (query.type) filter.type = query.type;
    if (query.courseId) filter.courseId = query.courseId;
    if (query.schoolId && scope.role === "admin") filter.schoolId = query.schoolId;
    if (query.status) filter.status = query.status;
    if (query.grade) filter.grade = query.grade;
    if (query.classSectionId) filter.classSectionIds = query.classSectionId;
    if (query.createdByRole) filter.createdByRole = query.createdByRole;

    return filter;
}

function mimeToType(mimeType = "") {
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (
        mimeType.includes("powerpoint") ||
        mimeType.includes("presentation")
    ) return "presentation";
    if (
        mimeType.includes("word") ||
        mimeType.includes("document") ||
        mimeType === "text/plain"
    ) return "doc";
    if (
        mimeType.includes("excel") ||
        mimeType.includes("spreadsheet")
    ) return "worksheet";
    if (mimeType.includes("zip")) return "zip";
    return "other";
}

function proxyCloudinaryFile(res, material) {
    const sourceUrl = material.cloudinarySecureUrl;
    if (!sourceUrl) {
        res.status(404).json({ message: "Material file not found" });
        return;
    }
    let parsedUrl;
    try {
        parsedUrl = new URL(sourceUrl);
    } catch {
        res.status(404).json({ message: "Material file not found" });
        return;
    }
    if (parsedUrl.protocol !== "https:") {
        res.status(403).json({ message: "Only secure material URLs are allowed" });
        return;
    }
    https.get(parsedUrl, (cloudRes) => {
        if (cloudRes.statusCode >= 300 && cloudRes.statusCode < 400 && cloudRes.headers.location) {
            https.get(cloudRes.headers.location, (redirectRes) => redirectRes.pipe(res)).on("error", () => {
                res.status(502).json({ message: "Unable to open material file" });
            });
            return;
        }
        res.setHeader("Content-Type", material.mimeType || cloudRes.headers["content-type"] || "application/octet-stream");
        res.setHeader("Cache-Control", "no-store");
        cloudRes.pipe(res);
    }).on("error", () => {
        res.status(502).json({ message: "Unable to open material file" });
    });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/materials/upload
 * Upload a new material to Cloudinary
 */
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        if (!["admin", "teacher"].includes(scope.role)) {
            return res.status(403).json({ message: "Insufficient permissions" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "No file provided" });
        }

        const {
            title,
            description,
            courseId,
            courseTrackId,
            lessonId,
            schoolId,
            grade,
            classSectionIds,
            assignments,
            tags,
            status,
            visibility,
            language
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Title is required" });
        }

        const mimeType = req.file.mimetype;
        const resourceType = getResourceType(mimeType);
        const detectedType = req.body.type || mimeToType(mimeType);

        // Upload to Cloudinary
        const cloudResult = await uploadFile(req.file.buffer, mimeType, req.file.originalname);

        const thumbnailUrl = generateThumbnailUrl(cloudResult.public_id, resourceType) || "";

        const finalSchoolId = scope.role === "admin" ? (schoolId || undefined) : scope.schoolId;
        let finalClassSectionIds = parseArray(classSectionIds);
        if (scope.role === "teacher") {
            finalClassSectionIds = finalClassSectionIds.filter((id) =>
                scope.classSectionIds.includes(String(id))
            );
        }

        const parsedTags = parseArray(tags);
        const parsedAssignments = normalizeAssignments(assignments, scope);

        const material = new Material({
            title: title.trim(),
            description: description || "",
            courseId: courseId || undefined,
            courseTrackId: courseTrackId || undefined,
            lessonId: lessonId || undefined,
            schoolId: finalSchoolId,
            grade: grade || "",
            classSectionIds: finalClassSectionIds,
            assignments: parsedAssignments,
            tags: parsedTags,
            type: detectedType,
            fileName: cloudResult.public_id,
            originalName: req.file.originalname,
            mimeType,
            size: req.file.size,
            cloudinaryPublicId: cloudResult.public_id,
            cloudinarySecureUrl: cloudResult.secure_url,
            cloudinaryResourceType: resourceType,
            thumbnailUrl,
            language: language || "en",
            status: status || "published",
            visibility: visibility || "students",
            isPublished: (status || "published") === "published",
            publishedDate: (status || "published") === "published" ? new Date() : undefined,
            createdBy: scope.userId,
            createdByRole: scope.role,
            viewer: {
                disableDownload: true,
                disablePrint: true,
                disableCopy: true,
                watermark: "RoboKidy Secure Viewer"
            }
        });

        await material.save();
        await material.populate("createdBy", "fullName username");
        await material.populate("courseId", "name");

        res.status(201).json(material);
    } catch (error) {
        console.error("Material upload error:", error);
        res.status(500).json({ message: "Upload failed", error: error.message });
    }
});

/**
 * GET /api/materials
 * List materials (role-filtered)
 */
router.get("/", async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        if (!["admin", "teacher"].includes(scope.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const filter = buildListFilter(scope, req.query);
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 30);
        const skip = (page - 1) * limit;

        const [materials, total] = await Promise.all([
            Material.find(filter)
                .populate("createdBy", "fullName username role")
                .populate("courseId", "name slug")
                .populate("schoolId", "name code")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Material.countDocuments(filter)
        ]);

        res.json({
            data: materials,
            pagination: { total, page, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("Materials fetch error:", error);
        res.status(500).json({ message: "Failed to fetch materials", error: error.message });
    }
});

/**
 * GET /api/materials/stats
 * Aggregate stats for dashboard
 */
router.get("/stats", async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        if (!["admin", "teacher"].includes(scope.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const filter = { active: true };

        const [typeAgg, statusAgg, totalViews] = await Promise.all([
            Material.aggregate([{ $match: filter }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
            Material.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
            Material.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: "$viewCount" } } }])
        ]);

        const byType = {};
        typeAgg.forEach((row) => { byType[row._id] = row.count; });

        const byStatus = {};
        statusAgg.forEach((row) => { byStatus[row._id] = row.count; });

        res.json({
            total: typeAgg.reduce((sum, row) => sum + row.count, 0),
            byType,
            byStatus,
            totalViews: totalViews[0]?.total || 0
        });
    } catch (error) {
        console.error("Stats error:", error);
        res.status(500).json({ message: "Failed to fetch stats", error: error.message });
    }
});

/**
 * GET /api/materials/:id
 * Single material (role-gated)
 */
router.get("/:id", async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        if (!["admin", "teacher"].includes(scope.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const material = await Material.findOne({ _id: req.params.id, active: true })
            .populate("createdBy", "fullName username role")
            .populate("courseId", "name slug")
            .populate("schoolId", "name code")
            .populate("classSectionIds", "name grade section");

        if (!material) return res.status(404).json({ message: "Material not found" });
        if (!canViewMaterial(scope, material)) return res.status(403).json({ message: "Access denied" });

        res.json({
            ...material.toObject(),
            fileUrl: `/api/materials/${material._id}/file`,
            viewer: {
                disableDownload: true,
                disablePrint: true,
                disableCopy: true,
                watermark: `${req.authUser?.username || req.user?.username || scope.role} | protected`
            }
        });
    } catch (error) {
        console.error("Material fetch error:", error);
        res.status(500).json({ message: "Failed to fetch material", error: error.message });
    }
});

router.get("/:id/file", async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        if (!["admin", "teacher"].includes(scope.role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        const material = await Material.findOne({ _id: req.params.id, active: true }).lean();
        if (!material) return res.status(404).json({ message: "Material file not found" });
        if (!canViewMaterial(scope, material)) return res.status(403).json({ message: "Access denied" });
        proxyCloudinaryFile(res, material);
    } catch (error) {
        res.status(500).json({ message: "Failed to open material file", error: error.message });
    }
});

/**
 * PUT /api/materials/:id
 * Update material metadata
 */
router.put("/:id", async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        const material = await Material.findOne({ _id: req.params.id, active: true });

        if (!material) return res.status(404).json({ message: "Material not found" });
        if (!canEditMaterial(scope, material)) return res.status(403).json({ message: "Access denied" });

        const {
            title, description, courseId, courseTrackId, grade, tags, visibility,
            status, isPublished, language, classSectionIds, assignments, schoolId
        } = req.body;

        if (title) material.title = title.trim();
        if (description !== undefined) material.description = description;
        if (courseId !== undefined) material.courseId = courseId || undefined;
        if (courseTrackId !== undefined) material.courseTrackId = courseTrackId || undefined;
        if (grade !== undefined) material.grade = grade;
        if (tags !== undefined) material.tags = parseArray(tags);
        if (visibility) material.visibility = visibility;
        if (language) material.language = language;
        if (classSectionIds !== undefined) material.classSectionIds = parseArray(classSectionIds);
        if (assignments !== undefined) material.assignments = normalizeAssignments(assignments, scope);
        if (schoolId && scope.role === "admin") material.schoolId = schoolId;

        if (isPublished !== undefined && !status) {
            material.status = isPublished ? "published" : "draft";
            material.isPublished = Boolean(isPublished);
            material.active = true;
            if (isPublished && !material.publishedDate) material.publishedDate = new Date();
        }

        if (status) {
            material.status = status;
            material.isPublished = status === "published";
            material.active = true;
            if (status === "published" && !material.publishedDate) {
                material.publishedDate = new Date();
            }
        }

        material.updatedBy = scope.userId;
        await material.save();
        await material.populate("createdBy", "fullName username");
        await material.populate("courseId", "name");

        res.json(material);
    } catch (error) {
        console.error("Material update error:", error);
        res.status(500).json({ message: "Failed to update material", error: error.message });
    }
});

/**
 * POST /api/materials/:id/replace
 * Replace file (upload new to Cloudinary, delete old)
 */
router.post("/:id/replace", upload.single("file"), async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        const material = await Material.findOne({ _id: req.params.id, active: true });

        if (!material) return res.status(404).json({ message: "Material not found" });
        if (!canEditMaterial(scope, material)) return res.status(403).json({ message: "Access denied" });
        if (!req.file) return res.status(400).json({ message: "No file provided" });

        const mimeType = req.file.mimetype;
        const resourceType = getResourceType(mimeType);

        const cloudResult = await replaceFile(
            material.cloudinaryPublicId,
            material.cloudinaryResourceType || "raw",
            req.file.buffer,
            mimeType,
            req.file.originalname
        );

        material.cloudinaryPublicId = cloudResult.public_id;
        material.cloudinarySecureUrl = cloudResult.secure_url;
        material.cloudinaryResourceType = resourceType;
        material.thumbnailUrl = generateThumbnailUrl(cloudResult.public_id, resourceType) || "";
        material.fileName = cloudResult.public_id;
        material.originalName = req.file.originalname;
        material.mimeType = mimeType;
        material.size = req.file.size;
        material.type = req.body.type || mimeToType(mimeType);
        material.updatedBy = scope.userId;

        await material.save();
        res.json(material);
    } catch (error) {
        console.error("Material replace error:", error);
        res.status(500).json({ message: "Failed to replace file", error: error.message });
    }
});

/**
 * POST /api/materials/:id/duplicate
 * Duplicate a material record (same Cloudinary file, new DB entry)
 */
router.post("/:id/duplicate", async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        if (!["admin", "teacher"].includes(scope.role)) {
            return res.status(403).json({ message: "Insufficient permissions" });
        }

        const original = await Material.findOne({ _id: req.params.id, active: true }).lean();
        if (!original) return res.status(404).json({ message: "Material not found" });
        if (!canViewMaterial(scope, original)) return res.status(403).json({ message: "Access denied" });

        const { _id, createdAt, updatedAt, viewCount, uniqueViewers, lastViewedAt, ...rest } = original;

        const duplicate = new Material({
            ...rest,
            title: `${original.title} (Copy)`,
            status: "draft",
            isPublished: false,
            viewCount: 0,
            uniqueViewers: [],
            assignments: [],
            createdBy: scope.userId,
            createdByRole: scope.role
        });

        await duplicate.save();
        await duplicate.populate("createdBy", "fullName username");

        res.status(201).json(duplicate);
    } catch (error) {
        console.error("Material duplicate error:", error);
        res.status(500).json({ message: "Failed to duplicate material", error: error.message });
    }
});

/**
 * PATCH /api/materials/:id/archive
 * Toggle archive status
 */
router.patch("/:id/archive", async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        const material = await Material.findOne({ _id: req.params.id });

        if (!material) return res.status(404).json({ message: "Material not found" });
        if (!canEditMaterial(scope, material)) return res.status(403).json({ message: "Access denied" });

        if (material.status === "archived") {
            material.status = "published";
            material.isPublished = true;
            material.active = true;
        } else {
            material.status = "archived";
            material.isPublished = false;
            material.active = true;
        }
        material.updatedBy = scope.userId;
        await material.save();

        res.json({ message: `Material ${material.status}`, status: material.status });
    } catch (error) {
        console.error("Archive error:", error);
        res.status(500).json({ message: "Failed to archive material", error: error.message });
    }
});

/**
 * DELETE /api/materials/:id
 * Hard delete + Cloudinary cleanup
 */
router.delete("/:id", async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        const material = await Material.findById(req.params.id);

        if (!material) return res.status(404).json({ message: "Material not found" });
        if (!canEditMaterial(scope, material)) return res.status(403).json({ message: "Access denied" });

        // Delete from Cloudinary
        if (material.cloudinaryPublicId) {
            await deleteFile(material.cloudinaryPublicId, material.cloudinaryResourceType || "raw");
        }

        await Material.deleteOne({ _id: req.params.id });
        await MaterialAnalytics.deleteMany({ materialId: req.params.id });

        res.json({ message: "Material deleted" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Failed to delete material", error: error.message });
    }
});

/**
 * POST /api/materials/:id/assign
 * Set assignment targets { assignments: [{type, refId}] }
 */
router.post("/:id/assign", async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        const material = await Material.findOne({ _id: req.params.id, active: true });

        if (!material) return res.status(404).json({ message: "Material not found" });
        if (!canEditMaterial(scope, material)) return res.status(403).json({ message: "Access denied" });

        const { assignments, classSectionIds, visibility } = req.body;

        if (assignments) {
            material.assignments = normalizeAssignments(assignments, scope);
        }
        if (classSectionIds && Array.isArray(classSectionIds)) {
            material.classSectionIds = classSectionIds;
        }
        if (visibility) material.visibility = visibility;

        // Auto-derive schoolId from first classSection if admin
        if (classSectionIds && classSectionIds.length && !material.schoolId && scope.role === "admin") {
            const cls = await ClassSection.findById(classSectionIds[0]).select("schoolId").lean();
            if (cls) material.schoolId = cls.schoolId;
        }

        material.updatedBy = scope.userId;
        if (material.status === "draft") {
            material.status = "published";
            material.isPublished = true;
            material.active = true;
        }
        await material.save();

        res.json({ message: "Assigned successfully", material });
    } catch (error) {
        console.error("Assign error:", error);
        res.status(500).json({ message: "Failed to assign material", error: error.message });
    }
});

/**
 * GET /api/materials/:id/analytics
 * Per-material analytics
 */
router.get("/:id/analytics", async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        if (!["admin", "teacher"].includes(scope.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const material = await Material.findOne({ _id: req.params.id, active: true }).lean();
        if (!material) return res.status(404).json({ message: "Material not found" });

        const [analytics, viewsByDay] = await Promise.all([
            MaterialAnalytics.find({ materialId: req.params.id })
                .populate("studentId", "fullName username grade")
                .sort({ viewedAt: -1 })
                .limit(100)
                .lean(),
            MaterialAnalytics.aggregate([
                { $match: { materialId: material._id } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$viewedAt" } },
                        views: { $sum: 1 },
                        avgTimeSpent: { $avg: "$timeSpent" }
                    }
                },
                { $sort: { _id: 1 } },
                { $limit: 30 }
            ])
        ]);

        res.json({
            materialId: req.params.id,
            title: material.title,
            totalViews: material.viewCount || 0,
            uniqueViewers: (material.uniqueViewers || []).length,
            lastViewedAt: material.lastViewedAt,
            viewsByDay,
            recentViewers: analytics.slice(0, 20).map((a) => ({
                student: a.studentId,
                viewedAt: a.viewedAt,
                timeSpent: a.timeSpent,
                completed: a.completed
            }))
        });
    } catch (error) {
        console.error("Analytics error:", error);
        res.status(500).json({ message: "Failed to fetch analytics", error: error.message });
    }
});

/**
 * POST /api/materials/:id/track-view
 * Log a view event (called when student opens material)
 */
router.post("/:id/track-view", async (req, res) => {
    try {
        const scope = getUserScope(req.authUser || req.user);
        const { timeSpent, completed } = req.body;

        await Material.updateOne(
            { _id: req.params.id },
            {
                $inc: { viewCount: 1 },
                $addToSet: { uniqueViewers: scope.userId },
                $set: { lastViewedAt: new Date() }
            }
        );

        // Log analytics
        await MaterialAnalytics.findOneAndUpdate(
            { materialId: req.params.id, studentId: scope.userId },
            {
                $set: { viewedAt: new Date(), completed: completed || false },
                $inc: { timeSpent: timeSpent || 0, sessionCount: 1 }
            },
            { upsert: true, new: true }
        );

        res.json({ ok: true });
    } catch (error) {
        console.error("Track view error:", error);
        res.status(500).json({ message: "Failed to track view", error: error.message });
    }
});

module.exports = router;
