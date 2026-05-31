import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import LoginPage from "@/pages/LoginPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import NotFoundPage from "@/pages/NotFoundPage";
import Index from "@/pages/Index";
import LessonsPage from "@/pages/student/LessonsPage";
import MaterialsPage from "@/pages/student/MaterialsPage";
import MaterialViewerPage from "@/pages/student/MaterialViewerPage";
import LessonViewerPage from "@/pages/student/LessonViewerPage";
import QuizPage from "@/pages/student/QuizPage";
import CodeLabPage from "@/pages/student/CodeLabPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminAnalyticsPage from "@/pages/admin/AdminAnalyticsPage";
import AdminContentPage from "@/pages/admin/AdminContentPage";
import AdminMaterialsPage from "@/pages/admin/AdminMaterialsPage";
import AdminProgressPage from "@/pages/admin/AdminProgressPage";
import AdminCoursesPage from "@/pages/admin/AdminCoursesPage";
import AdminSchoolsPage from "@/pages/admin/AdminSchoolsPage";
import AdminAiTutorPage from "@/pages/admin/AdminAiTutorPage";
import AdminCompetitionsPage from "@/pages/admin/AdminCompetitionsPage";
import AssessmentCenterPage from "@/pages/assessment/AssessmentCenterPage";
import AssessmentAttemptPage from "@/pages/assessment/AssessmentAttemptPage";
import CeoDashboard from "@/pages/admin/CeoDashboard";
import TeacherShell from "@/components/layout/TeacherShell";
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import ClassesPage from "@/pages/teacher/ClassesPage";
import ClassDetailsPage from "@/pages/teacher/ClassDetailsPage";
import StudentsPage from "@/pages/teacher/StudentsPage";
import AttendancePage from "@/pages/teacher/AttendancePage";
import AssignmentsPage from "@/pages/teacher/AssignmentsPage";
import TeacherMaterialsPage from "@/pages/teacher/MaterialsPage";
import TeacherCurriculumPage from "@/pages/teacher/CurriculumPage";
import CodingPage from "@/pages/teacher/CodingPage";
import AnalyticsPage from "@/pages/teacher/AnalyticsPage";
import MessagesPage from "@/pages/teacher/MessagesPage";
import StudentAutoRedirect from "@/components/layout/StudentAutoRedirect";

const App = () => (
  <ErrorBoundary>
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
        <Route path="/student" element={<ProtectedRoute role="student"><StudentAutoRedirect /></ProtectedRoute>} />
        <Route path="/student/lessons" element={<ProtectedRoute role="student"><LessonsPage /></ProtectedRoute>} />
        <Route path="/student/lessons/:id" element={<ProtectedRoute role="student"><LessonViewerPage /></ProtectedRoute>} />
        <Route path="/student/materials" element={<ProtectedRoute role="student"><MaterialsPage /></ProtectedRoute>} />
        <Route path="/student/materials/:id" element={<ProtectedRoute role="student"><MaterialViewerPage /></ProtectedRoute>} />
        <Route path="/student/quizzes" element={<ProtectedRoute role="student"><QuizPage /></ProtectedRoute>} />
        <Route path="/student/quiz" element={<ProtectedRoute role="student"><QuizPage /></ProtectedRoute>} />
        <Route path="/student/progress" element={<ProtectedRoute role="student"><StudentAutoRedirect /></ProtectedRoute>} />
        <Route path="/student/tests" element={<ProtectedRoute role="student"><AssessmentCenterPage /></ProtectedRoute>} />
        <Route path="/student/tests/:id" element={<ProtectedRoute role="student"><AssessmentAttemptPage /></ProtectedRoute>} />
        <Route path="/student/code" element={<ProtectedRoute role="student"><CodeLabPage /></ProtectedRoute>} />
        <Route path="/student/codelab" element={<ProtectedRoute role="student"><CodeLabPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><CeoDashboard /></ProtectedRoute>} />
        <Route path="/admin/schools" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/teachers" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/classes" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/fees" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/attendance" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/courses" element={<ProtectedRoute role="admin"><AdminCoursesPage /></ProtectedRoute>} />
        <Route path="/admin/materials" element={<ProtectedRoute role="admin"><AdminMaterialsPage /></ProtectedRoute>} />
        <Route path="/admin/curriculum" element={<ProtectedRoute role="admin"><AdminCoursesPage /></ProtectedRoute>} />
        <Route path="/admin/assessments" element={<ProtectedRoute role="admin"><AssessmentCenterPage /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute role="admin"><AdminProgressPage /></ProtectedRoute>} />
        <Route path="/admin/progress" element={<ProtectedRoute role="admin"><AdminProgressPage /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AdminAnalyticsPage /></ProtectedRoute>} />
        <Route path="/admin/ai-tutor" element={<ProtectedRoute role="admin"><AdminAiTutorPage /></ProtectedRoute>} />
        <Route path="/admin/competitions" element={<ProtectedRoute role="admin"><AdminCompetitionsPage /></ProtectedRoute>} />
        <Route path="/admin/content" element={<ProtectedRoute role="admin"><AdminContentPage /></ProtectedRoute>} />
        <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherShell /></ProtectedRoute>}>
          <Route index element={<TeacherDashboard />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="classes/:id" element={<ClassDetailsPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="assessments" element={<AssessmentCenterPage />} />
          <Route path="materials" element={<TeacherMaterialsPage />} />
          <Route path="curriculum" element={<TeacherCurriculumPage />} />
          <Route path="coding" element={<CodingPage />} />
          <Route path="codelab" element={<CodingPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="reports" element={<AnalyticsPage />} />
          <Route path="messages" element={<MessagesPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
  </ErrorBoundary>
);

export default App;
