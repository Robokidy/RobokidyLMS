# Unified CMS Implementation Guide

## Quick Start

### For Admin Curriculum Page

Replace the entire `src/pages/admin/AdminContentPage.tsx` with:

```typescript
import UnifiedCurriculumPage from "@/modules/curriculum/UnifiedCurriculumPage";

export default function AdminContentPage() {
  return <UnifiedCurriculumPage shell="admin" />;
}
```

### For Teacher Curriculum Page

Replace the entire `src/pages/teacher/CurriculumPage.tsx` with:

```typescript
import UnifiedCurriculumPage from "@/modules/curriculum/UnifiedCurriculumPage";

export default function TeacherCurriculumPage() {
  return <UnifiedCurriculumPage shell="teacher" />;
}
```

### For Admin Materials Page

Replace the entire `src/pages/admin/AdminMaterialsPage.tsx` with:

```typescript
import UnifiedMaterialsPage from "@/modules/materials/UnifiedMaterialsPage";

export default function AdminMaterialsPage() {
  return <UnifiedMaterialsPage shell="admin" />;
}
```

### For Teacher Materials Page

Replace the entire `src/pages/teacher/MaterialsPage.tsx` with:

```typescript
import UnifiedMaterialsPage from "@/modules/materials/UnifiedMaterialsPage";

export default function TeacherMaterialsPage() {
  return <UnifiedMaterialsPage shell="teacher" />;
}
```

---

## Using the Services in Custom Pages

If you need to build custom pages or components, use the unified services:

### Example 1: Custom Lesson List

```typescript
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LessonService } from "@/modules/shared/contentService";

export function MyLessonList() {
  const { token } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadLessons = async () => {
      setLoading(true);
      try {
        const data = await LessonService.getAll(token, {
          courseId: "abc123",
          page: 1,
          limit: 20
        });
        setLessons(data.data);
      } catch (error) {
        console.error("Failed to load lessons:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) loadLessons();
  }, [token]);

  return (
    <div>
      {lessons.map(lesson => (
        <div key={lesson._id}>
          <h3>{lesson.title}</h3>
          <p>{lesson.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Create Lesson

```typescript
import { LessonService } from "@/modules/shared/contentService";
import { useAuth } from "@/context/AuthContext";

export function CreateLessonForm() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleCreate = async (formData) => {
    setLoading(true);
    try {
      const lesson = await LessonService.create(
        {
          title: "My Lesson",
          content: "<h1>Hello</h1>",
          courseId: "course123",
          objectives: ["Learn something", "Do something"],
          duration: 45
        },
        token
      );
      console.log("Lesson created:", lesson);
    } catch (error) {
      console.error("Failed to create:", error);
    } finally {
      setLoading(false);
    }
  };

  return <button onClick={() => handleCreate({})}>Create Lesson</button>;
}
```

### Example 3: Publish/Unpublish

```typescript
import { LessonService } from "@/modules/shared/contentService";

async function togglePublish(lessonId, isPublished, token) {
  try {
    if (isPublished) {
      await LessonService.unpublish(lessonId, token);
    } else {
      await LessonService.publish(lessonId, token);
    }
  } catch (error) {
    console.error("Failed to update publish status:", error);
  }
}
```

### Example 4: Materials Upload

```typescript
import { MaterialService } from "@/modules/shared/contentService";
import { MaterialUploader } from "@/modules/materials/MaterialUploader";

export function MyMaterialsPage() {
  const { token } = useAuth();

  const handleUpload = async (data, file) => {
    try {
      // In real scenario, upload file first and get URL
      const material = await MaterialService.create({
        ...data,
        filePath: "/uploads/materials/file.pdf",
        size: file.size
      }, token);
      console.log("Material uploaded:", material);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <MaterialUploader
      courses={courses}
      onUpload={handleUpload}
      onCancel={() => {}}
    />
  );
}
```

---

## Using Shared Components

### ContentList Component

Used for displaying any list of content items:

```typescript
import { ContentList } from "@/modules/shared/ContentList";

<ContentList
  title="My Lessons"
  description="Manage your course lessons"
  items={lessons}
  columns={[
    {
      key: "title",
      label: "Lesson Name",
      render: (value, item) => (
        <div>
          <strong>{value}</strong>
          <p className="text-sm text-gray-500">{item.courseId?.name}</p>
        </div>
      )
    },
    { key: "duration", label: "Duration", width: "100px" },
    { key: "status", label: "Status" }
  ]}
  onSearch={(query) => setSearch(query)}
  onEdit={(lesson) => openEditor(lesson)}
  onDelete={(lesson) => deleteLesson(lesson._id)}
  onAdd={() => openCreateForm()}
  onPublish={(lesson) => togglePublish(lesson)}
  loading={loading}
  canAdd={true}
  canDelete={true}
  canPublish={true}
/>
```

### LessonEditor Component

Rich text editor for lessons:

```typescript
import { LessonEditor } from "@/modules/editors/LessonEditor";
import { useState } from "react";

export function MyLessonPage() {
  const [lesson, setLesson] = useState(null);
  const [courses, setCourses] = useState([]);

  const handleSave = async (data) => {
    if (lesson) {
      await LessonService.update(lesson._id, data, token);
    } else {
      await LessonService.create(data, token);
    }
  };

  return (
    <LessonEditor
      lesson={lesson}
      courses={courses}
      onSave={handleSave}
      onCancel={() => setLesson(null)}
    />
  );
}
```

### MaterialUploader Component

Professional file upload:

```typescript
import { MaterialUploader } from "@/modules/materials/MaterialUploader";

<MaterialUploader
  courses={courses}
  lessons={lessons}
  classSections={classSections}
  onUpload={async (data, file) => {
    // Handle file upload
  }}
  onCancel={() => {}}
/>
```

---

## Using Permissions Hook

Check user permissions in your components:

```typescript
import { usePermissions } from "@/modules/permissions/usePermissions";

export function MyComponent() {
  const permissions = usePermissions();

  if (permissions.isAdmin()) {
    return <AdminPanel />;
  }

  if (permissions.isTeacher()) {
    return <TeacherPanel />;
  }

  return <StudentPanel />;
}
```

### Conditional Rendering

```typescript
function LessonActions({ lesson }) {
  const permissions = usePermissions();

  return (
    <div>
      {permissions.canEditContent(lesson.createdBy) && (
        <button onClick={() => editLesson(lesson)}>Edit</button>
      )}

      {permissions.canPublishContent(lesson.createdBy) && (
        <button onClick={() => togglePublish(lesson)}>
          {lesson.isPublished ? "Unpublish" : "Publish"}
        </button>
      )}

      {permissions.canDeleteContent(lesson.createdBy) && (
        <button onClick={() => deleteLesson(lesson)}>Delete</button>
      )}
    </div>
  );
}
```

---

## File Upload Implementation

To handle actual file uploads, implement this in your backend or use a file service:

### Option 1: Direct Server Upload

```typescript
// Add to server/src/routes/contentRoutes.js

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads/materials"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

router.post("/materials/upload", upload.single("file"), async (req, res) => {
  try {
    // File is in req.file
    const filePath = `/uploads/materials/${req.file.filename}`;
    
    // Create material record
    const material = await Material.create({
      ...req.body,
      filePath,
      fileName: req.file.filename,
      size: req.file.size
    });

    res.json(material);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Option 2: Cloud Upload (AWS S3, Firebase, etc.)

```typescript
// Use a cloud storage library
import AWS from "aws-sdk";

const s3 = new AWS.S3();

export async function uploadToS3(file: File) {
  const params = {
    Bucket: "my-bucket",
    Key: `materials/${Date.now()}_${file.name}`,
    Body: file,
    ContentType: file.type
  };

  const { Location } = await s3.upload(params).promise();
  return Location;
}
```

---

## API Response Format

All API endpoints follow this format:

### Successful List Response

```json
{
  "data": [
    { "_id": "123", "title": "Lesson 1", ... },
    { "_id": "124", "title": "Lesson 2", ... }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 5
  }
}
```

### Successful Single Item Response

```json
{
  "_id": "123",
  "title": "My Lesson",
  "content": "...",
  "createdBy": {
    "_id": "user123",
    "fullName": "John Doe"
  },
  "courseId": {
    "_id": "course123",
    "name": "Python Basics"
  },
  ...
}
```

### Error Response

```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## Database Migration (Optional)

If you have existing data in separate admin/teacher collections, migrate to unified collections:

```javascript
// Migration script
const Lesson = require("./models/Lesson");

async function migrateData() {
  // Data is already in unified Lesson collection
  // Just ensure all documents have required new fields
  
  const count = await Lesson.updateMany(
    { order: { $exists: false } },
    { $set: { order: 0 } }
  );
  
  console.log(`Updated ${count.modifiedCount} lessons`);
}
```

---

## Testing

### Test Create Lesson

```typescript
import { LessonService } from "@/modules/shared/contentService";

describe("LessonService", () => {
  it("should create a lesson", async () => {
    const data = {
      title: "Test Lesson",
      content: "<p>Test</p>",
      courseId: "course123",
      objectives: ["Learn"]
    };

    const lesson = await LessonService.create(data, "token");
    expect(lesson._id).toBeDefined();
    expect(lesson.title).toBe("Test Lesson");
  });
});
```

### Test Permissions

```typescript
import { usePermissions } from "@/modules/permissions/usePermissions";

describe("usePermissions", () => {
  it("should check teacher edit permission", () => {
    const permissions = usePermissions();
    expect(permissions.canEditContent("userId123")).toBe(true);
  });
});
```

---

## Troubleshooting

### Q: Services not working?
A: Ensure token is valid and user is authenticated. Check browser console for API errors.

### Q: Content not showing?
A: Check user role and school/class assignments. Use browser DevTools to inspect API response.

### Q: Upload failing?
A: Ensure file size < 500MB, correct file type, and valid course/material metadata.

### Q: Can't edit content?
A: Check if you're the creator or admin. Teachers can only edit their own content.

---

## Summary

✅ Backend: Unified MongoDB collections with role-based API (`/api/content/*`)  
✅ Frontend: Shared services (`LessonService`, `MaterialService`, etc.)  
✅ UI: Reusable components (`ContentList`, `LessonEditor`, `MaterialUploader`)  
✅ Permissions: RBAC hook (`usePermissions`)  
✅ Admin Page: Replace with `<UnifiedCurriculumPage shell="admin" />`  
✅ Teacher Page: Replace with `<UnifiedCurriculumPage shell="teacher" />`  
✅ Materials: Replace with `<UnifiedMaterialsPage shell="admin/teacher" />`

You're ready to use the unified CMS system!
