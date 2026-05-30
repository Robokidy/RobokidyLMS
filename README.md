# LearnPy Student Learning & Tracking Platform

## Folder Structure

```text
LearnPy/
  src/
    api/client.ts
    context/AuthContext.tsx
    components/layout/{Header,ProtectedRoute,DarkModeToggle}.tsx
    pages/
      LoginPage.tsx
      ChangePasswordPage.tsx
      student/{StudentDashboard,LessonsPage,QuizPage,CodeLabPage}.tsx
      admin/{AdminDashboard,AdminStudentsPage,AdminContentPage,AdminAnalyticsPage}.tsx
  server/
    src/
      config/db.js
      middleware/auth.js
      models/{User,Lesson,Quiz,StudentProgress,ActivityLog}.js
      routes/{authRoutes,studentRoutes,adminRoutes,codeRoutes}.js
      utils/password.js
      {index,seed}.js
```

## MongoDB Collections

- `users`: username, password(hash), role, firstLogin, active
- `lessons`: title, content, examples
- `quizzes`: lessonId, questions[] (question/options/correctAnswer)
- `studentprogresses`: userId, completedLessons[], quizAttempts[], codeRunCount
- `activitylogs`: userId, action, meta

## Run Locally

1. Frontend install:
   - `npm install`
2. Backend install:
   - `cd server && npm install`
3. Create env files:
   - Frontend: copy `.env.example` -> `.env`
   - Backend: copy `server/.env.example` -> `server/.env`
4. Seed admin + starter lessons/quizzes:
   - `cd server && npm run seed`
5. Run backend:
   - `cd server && npm run dev`
6. Run frontend:
   - `npm run dev`

## Default Admin

- Username: from `ADMIN_USERNAME` in `server/.env`
- Password: from `ADMIN_PASSWORD` in `server/.env`

## Feature Coverage

- JWT login for admin/student
- One admin account seeded in DB
- Student first-login forced password change
- Student dashboard, lessons, quiz, code practice
- Quiz attempt tracking: attempts, best score, last score
- Code run tracking per student
- Admin dashboard, student creation with temporary password
- Content management (lesson CRUD)
- Analytics: progress %, weak topics, activity logs
- Dark mode toggle
