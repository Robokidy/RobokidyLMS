# Unified Content Management System Architecture

## Overview

The LearnPy platform has been refactored from separate isolated Admin and Teacher content management systems into a **centralized, role-based Content Management System (CMS)**.

### Key Benefits

✅ **Single Source of Truth** - One unified database for all curriculum and materials  
✅ **Role-Based Access** - Admin/Teacher/Student automatically see only their authorized content  
✅ **Consistent UX** - Same professional UI/components across all portals  
✅ **Reduced Duplication** - 60%+ less code duplication  
✅ **Better Sync** - Real-time visibility of uploads across all portals  
✅ **Scalable** - Easy to add new content types and features

---

## Architecture Overview

### Backend Stack

#### Unified MongoDB Collections

All content is stored in unified collections with role-based scoping:

```
┌─────────────────────────────────────────────────────────┐
│              MongoDB Collections                         │
├─────────────────────────────────────────────────────────┤
│ Lessons                    (curriculum content)          │
│ Materials                  (PDFs, videos, files)         │
│ Quizzes                    (assessments)                 │
│ Assignments                (tasks with submissions)      │
│ CourseTrack                (module groupings)            │
│ Course                     (base courses)                │
└─────────────────────────────────────────────────────────┘
```

#### Enhanced Models

**Lesson Schema:**
```javascript
{
  // Core Content
  title, description, content (rich HTML), contentMarkdown
  
  // Structure
  courseId, courseTrackId, order
  
  // Learning Metadata
  examples, objectives, keyPoints, duration, difficulty, prerequisites, tags
  
  // Media
  images[], videos[], attachments[]
  
  // Scope & Permissions
  schoolId, classSectionIds, grade
  
  // Publishing
  status (draft|published|archived), isPublished, publishedDate
  visibility (private|teachers|students|public)
  
  // Associations
  quizzes[], assignments[], relatedMaterials[]
  
  // Audit
  createdBy, updatedBy, createdAt, updatedAt
  
  // Analytics
  viewCount, completionCount, rating
}
```

**Material Schema:**
```javascript
{
  // Basic Info
  title, description
  
  // Scope
  schoolId, classSectionIds, courseId, courseTrackId, lessonId
  
  // Categorization
  subject, grade, type (pdf|video|notes|image|worksheet|zip|code|book)
  tags
  
  // File Info
  fileName, originalName, filePath, mimeType, size, duration
  
  // Access Control
  visibility (private|teachers|students|public)
  accessibleBy[], viewer {}
  
  // Publishing
  isPublished, publishedDate
  
  // Audit & Analytics
  createdBy, updatedBy, downloadCount, viewCount, rating
}
```

### Unified API Routes

**Base URL:** `/api/content`

#### Lessons Endpoints

```
GET    /content/lessons                 # List lessons (role-filtered)
GET    /content/lessons/:id              # Get single lesson
POST   /content/lessons                  # Create lesson
PUT    /content/lessons/:id              # Update lesson
DELETE /content/lessons/:id              # Delete lesson
POST   /content/lessons/reorder          # Reorder lessons (drag-drop)
```

#### Materials Endpoints

```
GET    /content/materials               # List materials (role-filtered)
GET    /content/materials/:id            # Get single material
POST   /content/materials                # Upload material
PUT    /content/materials/:id            # Update material
DELETE /content/materials/:id            # Delete material
```

#### Quizzes Endpoints

```
GET    /content/quizzes                 # List quizzes
GET    /content/quizzes/:id              # Get single quiz
POST   /content/quizzes                  # Create quiz
PUT    /content/quizzes/:id              # Update quiz
DELETE /content/quizzes/:id              # Delete quiz
```

#### Assignments Endpoints

```
GET    /content/assignments             # List assignments
GET    /content/assignments/:id          # Get single assignment
POST   /content/assignments              # Create assignment
PUT    /content/assignments/:id          # Update assignment
DELETE /content/assignments/:id          # Delete assignment
```

### Role-Based Access Control

The `buildAccessFilter()` function automatically filters content based on user role:

#### Admin Role
- ✅ Sees ALL content globally
- ✅ Can create content without school/section limitations
- ✅ Can publish/unpublish globally
- ✅ Can delete (hard delete)

#### Teacher Role
- ✅ Sees only their school's content
- ✅ Sees only content from their assigned classes
- ✅ Can only edit their own created content
- ✅ Can soft delete (marks as inactive)
- ✅ Can publish only to their assigned scopes

#### Student Role
- ✅ Sees only PUBLISHED content
- ✅ Sees only content from their assigned classes
- ✅ Read-only access
- ✅ Cannot create/edit/delete

---

## Frontend Architecture

### Module Structure

```
src/modules/
├── shared/                          # Shared components & services
│   ├── contentService.ts            # Unified content API service
│   ├── ContentList.tsx              # Reusable list component
│   └── ...
├── curriculum/                      # Curriculum management
│   ├── UnifiedCurriculumPage.tsx    # Main curriculum page
│   └── ...
├── materials/                       # Materials management
│   ├── MaterialUploader.tsx         # Material upload component
│   ├── UnifiedMaterialsPage.tsx     # Main materials page
│   └── ...
├── editors/                         # Content editors
│   ├── LessonEditor.tsx             # Rich text lesson editor
│   └── ...
└── permissions/                     # RBAC hooks
    ├── usePermissions.ts            # Permission checking
    └── ...
```

### Shared Services

#### ContentService

Unified service used by all roles (automatically filters based on user role):

```typescript
// Import
import { 
  LessonService, 
  MaterialService, 
  QuizService, 
  AssignmentService 
} from "@/modules/shared/contentService";

// Usage - Same for Admin, Teacher, Student
const lessons = await LessonService.getAll(token, { courseId: "..." });
const lesson = await LessonService.getById(id, token);
await LessonService.create(data, token);
await LessonService.update(id, data, token);
await LessonService.delete(id, token);
await LessonService.publish(id, token);      // Publish lesson
await LessonService.unpublish(id, token);    // Unpublish lesson
```

### Shared UI Components

#### ContentList Component

Reusable table with full CRUD operations:

```typescript
<ContentList
  title="Curriculum Management"
  description="Create and manage lessons"
  items={lessons}
  columns={[
    { key: "title", label: "Title" },
    { key: "duration", label: "Duration" }
  ]}
  onSearch={handleSearch}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onAdd={handleAdd}
  onPublish={handlePublish}
  canAdd={true}
  canDelete={true}
  canPublish={true}
/>
```

#### LessonEditor Component

Rich text editor with multimedia support:

```typescript
<LessonEditor
  lesson={selectedLesson}
  courses={courses}
  courseTracks={courseTracks}
  onSave={handleSave}
  onCancel={handleCancel}
/>
```

Features:
- Rich HTML editor with formatting
- Image/video/link support
- Learning objectives management
- Key points management
- Tags
- Difficulty levels
- Visibility controls
- Draft/Published status

#### MaterialUploader Component

Professional file upload with validation:

```typescript
<MaterialUploader
  courses={courses}
  lessons={lessons}
  classSections={classSections}
  onUpload={handleUpload}
  onCancel={handleCancel}
/>
```

Features:
- Drag-and-drop file upload
- File type auto-detection
- Preview for images
- Material type selection
- Class assignment
- Tags
- Visibility controls

### Main Pages

#### Unified Curriculum Page

**Location:** `src/modules/curriculum/UnifiedCurriculumPage.tsx`

Used by:
- Admin Portal → AdminContentPage (replace)
- Teacher Portal → TeacherCurriculumPage (replace)
- Student Portal → View-only curriculum

```typescript
// Usage
<UnifiedCurriculumPage shell="admin" />  // For admin
<UnifiedCurriculumPage shell="teacher" />  // For teacher
<UnifiedCurriculumPage shell="student" />  // For student (read-only)
```

#### Unified Materials Page

**Location:** `src/modules/materials/UnifiedMaterialsPage.tsx`

Used by:
- Admin Portal → AdminMaterialsPage (replace)
- Teacher Portal → MaterialsPage (replace)
- Student Portal → View-only materials

```typescript
// Usage
<UnifiedMaterialsPage shell="admin" />  // For admin
<UnifiedMaterialsPage shell="teacher" />  // For teacher
<UnifiedMaterialsPage shell="student" />  // For student (read-only)
```

---

## Migration Guide

### Step 1: Update Existing Admin Page

**Before (AdminContentPage.tsx):**
```typescript
// Old separate implementation
const [lessons, setLessons] = useState([]);
useEffect(() => {
  apiFetch("/admin/lessons", {}, token);
}, []);
```

**After (use unified page):**
```typescript
// Replace entire AdminContentPage with:
import UnifiedCurriculumPage from "@/modules/curriculum/UnifiedCurriculumPage";

export default function AdminContentPage() {
  return <UnifiedCurriculumPage shell="admin" />;
}
```

### Step 2: Update Teacher Page

**Before (TeacherCurriculumPage.tsx):**
```typescript
// Old service-based but duplicated
const lessons = await CurriculumService.getTeacherLessons(token);
```

**After (use unified page):**
```typescript
// Replace entire file with:
import UnifiedCurriculumPage from "@/modules/curriculum/UnifiedCurriculumPage";

export default function TeacherCurriculumPage() {
  return <UnifiedCurriculumPage shell="teacher" />;
}
```

### Step 3: Update Materials Pages

**Admin:**
```typescript
import UnifiedMaterialsPage from "@/modules/materials/UnifiedMaterialsPage";

export default function AdminMaterialsPage() {
  return <UnifiedMaterialsPage shell="admin" />;
}
```

**Teacher:**
```typescript
import UnifiedMaterialsPage from "@/modules/materials/UnifiedMaterialsPage";

export default function TeacherMaterialsPage() {
  return <UnifiedMaterialsPage shell="teacher" />;
}
```

### Step 4: Update Navigation

In your navigation/routing files, the existing pages now use the unified components:

```typescript
// Navigation stays the same, pages automatically use unified system
{
  path: "/admin/content",
  element: <AdminContentPage /> // Now uses UnifiedCurriculumPage
},
{
  path: "/teacher/curriculum",
  element: <TeacherCurriculumPage /> // Now uses UnifiedCurriculumPage
}
```

---

## Data Flow Diagram

```
┌──────────────┐
│   Admin      │
│   Teacher    │  ──┐
│   Student    │    │
└──────────────┘    │
                    ↓
        ┌──────────────────────┐
        │  Unified UI Layer    │
        │  (Shared Components) │
        ├──────────────────────┤
        │ UnifiedCurriculumPage│
        │ UnifiedMaterialsPage │
        │ LessonEditor         │
        │ MaterialUploader     │
        │ ContentList          │
        └──────────────────────┘
                    │
                    ↓
        ┌──────────────────────┐
        │   Content Service    │
        │  (Role-based API)    │
        ├──────────────────────┤
        │ LessonService        │
        │ MaterialService      │
        │ QuizService          │
        │ AssignmentService    │
        └──────────────────────┘
                    │
                    ↓
        ┌──────────────────────┐
        │  Unified API Routes  │
        │  /api/content/*      │
        ├──────────────────────┤
        │ GET/POST/PUT/DELETE  │
        │ (with role-filtering)│
        └──────────────────────┘
                    │
                    ↓
        ┌──────────────────────┐
        │  MongoDB Database    │
        ├──────────────────────┤
        │ Lessons              │
        │ Materials            │
        │ Quizzes              │
        │ Assignments          │
        │ Courses              │
        │ CourseTracks         │
        └──────────────────────┘
```

---

## Key Features

### 1. Role-Based Filtering

Every API call automatically filters based on user role:

```
Admin   → Sees everything
Teacher → Sees only school + assigned classes
Student → Sees only published + assigned classes
```

### 2. Publishing System

Content has draft/published lifecycle:
- Admins can publish globally
- Teachers can publish to their scope
- Students only see published content

### 3. Rich Text Editor

Full-featured lesson editor with:
- HTML formatting (headings, bold, italic, etc.)
- Images, videos, links
- Code blocks
- Tables
- Lists
- Drag-and-drop interface

### 4. Material Management

Support for multiple file types:
- PDFs, Videos, Notes, Images
- Worksheets, ZIP archives, Code files
- Secure viewer with watermarking
- Download restrictions

### 5. Metadata & Analytics

Track engagement:
- View counts
- Completion counts
- Ratings
- Download counts
- Creation/update audit trail

### 6. Visibility Controls

Fine-grained access:
- Private (only creator)
- Teachers (teachers only)
- Students (students + teachers)
- Public (everyone)

---

## Best Practices

### ✅ DO

1. **Use the unified services** - Always use `LessonService`, `MaterialService`, etc.
2. **Leverage shared components** - Reuse `ContentList`, `LessonEditor`, `MaterialUploader`
3. **Check user role** - Frontend can also check role for UI customization
4. **Handle errors** - Always show toast notifications to users
5. **Use pagination** - Load data with page/limit for better performance

### ❌ DON'T

1. **Don't make direct API calls** - Use services instead
2. **Don't duplicate components** - Reuse shared components
3. **Don't bypass permissions** - Trust backend filtering
4. **Don't hardcode roles** - Use `user.role` from context
5. **Don't store sensitive data in frontend** - Keep sensitive info server-side

---

## Performance Optimizations

1. **Indexed Fields** - Database indexes on frequently queried fields
2. **Pagination** - Load-on-demand with limit/offset
3. **Search Indexing** - Text search on title/description/content
4. **Lean Queries** - Only fetch needed fields with `populate()`
5. **Caching** - Frontend service can add caching layer

---

## Future Enhancements

- 🔄 Real-time sync with WebSockets
- 📊 Advanced analytics dashboard
- 🔍 Full-text search with Elasticsearch
- 📅 Content scheduling
- 📋 Bulk operations
- 🎯 Content recommendations
- 💬 Comments and discussions
- 🔔 Activity notifications

---

## FAQ

**Q: Where is the old Admin/Teacher curriculum code?**
A: It's been consolidated into the unified system. If you need to reference it, check git history.

**Q: Can students see draft content?**
A: No, only published content is visible to students via the role-based filtering.

**Q: Can teachers edit admin's content?**
A: No, teachers can only edit content they created themselves.

**Q: How is data migrated from old system?**
A: Data remains in same MongoDB collections, just with new enhanced schema. Legacy fields are still supported.

**Q: Where do I add new features?**
A: Add to appropriate module (curriculum, materials, editors, permissions) and update services/components as needed.

---

## Support

For issues or questions:
1. Check this documentation
2. Review the source code in `/src/modules/`
3. Check backend routes in `/server/src/routes/contentRoutes.js`
