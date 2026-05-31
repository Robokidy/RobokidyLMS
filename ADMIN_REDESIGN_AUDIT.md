# Admin Redesign Audit

## Completed

- Rebuilt the admin sidebar into grouped business navigation:
  - Executive
  - Organization
  - Learning
  - Operations
  - Communication
  - Reports
  - Settings
- Reworked the CEO dashboard so it is the only admin page with global KPI cards.
- Removed the global filter bar from admin pages.
- Removed duplicated page tabs from the main admin routes.
- Replaced Schools, Teachers, Students, and Classes tables with card views.
- Added route-specific search/dropdown filters only where useful.
- Added View/Edit/Archive actions backed by existing API routes.
- Added profile/detail dashboards with overview and related tabs.
- Reworked Fees with collection metrics, revenue chart, status rows, and CSV export.
- Reworked Attendance with daily marking, trend chart, absent count, and heatmap.
- Reworked Materials into a Drive-style repository with grid/list views and preview.
- Added backend/frontend support for `presentation` material type.
- Routed `/admin/curriculum` to the course-builder style curriculum management page.
- Added mandatory MCQ validation in Assessment Center:
  - Question text required.
  - Option A-D required.
  - Correct answer required.
- Added loading skeletons, empty states, error banners, and success toasts in the redesigned admin flows.

## API Actions Kept Functional

- Schools: create, edit, archive, view.
- Teachers: create, edit, archive, view.
- Students: create, edit, archive, view.
- Classes: create, edit, archive, view.
- Fees: create and export.
- Attendance: mark and save.
- Notifications: create, edit, archive.
- Materials: upload, preview, delete.
- Assessments: create questions, create tests, view results.

## Notes

Some requested experiences such as true drag-and-drop curriculum ordering, scheduled notification delivery, SMS/email provider execution, and real material download counters need backend/product work beyond the existing API surface. The UI is structured for those workflows, and currently avoids dead action buttons where no backend route exists.
