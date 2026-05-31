# Production Deployment Audit

## API Base Contract

Frontend API calls must use `src/api/client.ts`.

`VITE_API_URL` may be either:

- `https://robokidylms.onrender.com`
- `https://robokidylms.onrender.com/api`

The client normalizes both forms to `/api/...`.

## Route Mapping

| Frontend request | Backend route | Status | Required fix |
| --- | --- | --- | --- |
| `/auth/login` | `POST /api/auth/login` | Fixed | Central client now adds `/api` for host-only `VITE_API_URL`. |
| `/auth/change-password` | `POST /api/auth/change-password` | Fixed | Protected and token-authenticated. |
| `/auth/me` | `GET /api/auth/me` | Added | Used to validate stored tokens on refresh. |
| `/auth/logout` | `POST /api/auth/logout` | Added | Clears client session and records logout best-effort. |
| `/student/dashboard` | `GET /api/student/dashboard` | Verified | Uses centralized `apiFetch`. |
| `/student/lessons` | `GET /api/student/lessons` | Verified | Uses centralized `apiFetch`. |
| `/student/materials` | `GET /api/student/materials` | Verified | Uses centralized `apiFetch`. |
| `/student/materials/:id/file` | `GET /api/student/materials/:id/file` | Fixed | File viewer uses normalized API base. |
| `/student/quizzes/:lessonId` | `GET /api/student/quizzes/:lessonId` | Verified | Uses centralized `apiFetch`. |
| `/admin/dashboard` | `GET /api/admin/dashboard` | Verified | Uses centralized `apiFetch`. |
| `/admin/schools` | `GET/POST /api/admin/schools` | Verified | Uses centralized `apiFetch`. |
| `/admin/teachers` | `GET/POST /api/admin/teachers` | Verified | Uses centralized `apiFetch`. |
| `/admin/students` | `GET/POST /api/admin/students` | Verified | Uses centralized `apiFetch`. |
| `/admin/materials` | `GET/POST /api/admin/materials` | Fixed | Uploads use normalized API base. |
| `/admin/fees` | `GET/POST /api/admin/fees` | Verified | Uses centralized `apiFetch`. |
| `/teacher/dashboard` | `GET /api/teacher/dashboard` | Verified | Uses centralized `apiFetch`. |
| `/teacher/classes` | `GET/POST /api/teacher/classes` | Verified | Uses centralized `apiFetch`. |
| `/teacher/students` | `GET/POST /api/teacher/students` | Verified | Uses centralized `apiFetch`. |
| `/teacher/materials` | `GET/POST /api/teacher/materials` | Fixed | Uploads use normalized API base. |
| `/teacher/attendance` | `GET/POST /api/teacher/attendance` | Verified | Uses centralized `apiFetch`. |
| `/assessments/*` | `/api/assessments/*` | Verified | Uses centralized `apiFetch`. |
| `/exams/*` | `/api/exams/*` | Fixed | `baseURL` export restored for exam service. |
| `/reports/tests/*` | `/api/reports/tests/*` | Fixed | Backend report routes no longer double-prefix `/reports`. |
| `/reports/analytics/*` | `/api/reports/analytics/*` | Verified | Backend and frontend paths align. |
| `/course-tracks` | `/api/course-tracks` | Verified | Uses centralized `apiFetch`. |
| `/code/run` | `POST /api/code/run` | Verified | Uses centralized `apiFetch`. |

## SPA Routes

`vercel.json` rewrites all paths to `index.html`, preventing Vercel `404_NOT_FOUND` on direct refresh.

Declared route aliases include:

- `/student/quiz` and `/student/quizzes`
- `/student/codelab` and `/student/code`
- `/student/progress`
- `/admin/curriculum`
- `/admin/reports`
- `/teacher/codelab`
- `/teacher/reports`

## Backend Deployment

Required startup variables:

- `MONGODB_URI`
- `JWT_SECRET`

Recommended variables now warn if missing:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `NODE_ENV`
- `JUDGE0_API_KEY`

Render health check path:

- `GET /api/health` returns `{ "ok": true }`

## Remaining Production Verification

The code now builds and route contracts are aligned locally. Live production verification still requires deployed Render/Vercel environment access and real MongoDB Atlas credentials for:

- Login/logout/password change
- Role-based dashboards
- CRUD persistence
- Upload/download behavior
- CORS with the final Vercel custom domain
- MongoDB-backed module data checks
