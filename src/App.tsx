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
import StudentDashboard from "@/pages/student/StudentDashboard";
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
import AdminAssessmentManagementPage from "@/pages/admin/AdminAssessmentManagementPage";
import AdminSchoolReportsPage from "@/pages/admin/AdminSchoolReportsPage";
import AdminCertificatesPage from "@/pages/admin/AdminCertificatesPage";
import StudentCertificatesPage from "@/pages/certificates/StudentCertificatesPage";
import VerifyCertificatePage from "@/pages/certificates/VerifyCertificatePage";
import AssessmentCenterPage from "@/pages/assessment/AssessmentCenterPage";
import AssessmentAttemptPage from "@/pages/assessment/AssessmentAttemptPage";
import CeoDashboard from "@/pages/admin/CeoDashboard";
import MarketingDashboard from "@/pages/marketing/MarketingDashboard";
import TeacherShell from "@/components/layout/TeacherShell";
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import ClassDetailsPage from "@/pages/teacher/ClassDetailsPage";
import AssignmentsPage from "@/pages/teacher/AssignmentsPage";
import TeacherMaterialsPage from "@/pages/teacher/MaterialsPage";
import TeacherQuizAssessmentPage from "@/pages/teacher/TeacherQuizAssessmentPage";
import TeacherCertificatesPage from "@/pages/teacher/TeacherCertificatesPage";
import TeacherReportsPage from "@/pages/teacher/TeacherReportsPage";
import TeacherProfilePage from "@/pages/teacher/TeacherProfilePage";
import DailyWorkLogPage from "@/pages/teacher/DailyWorkLogPage";
import AttendancePage from "@/pages/teacher/AttendancePage";
import UnifiedMaterialsPage from "@/modules/materials/UnifiedMaterialsPage";
import UnifiedCurriculumPage from "@/modules/curriculum/UnifiedCurriculumPage";
import CodingPage from "@/pages/teacher/CodingPage";
import AnalyticsPage from "@/pages/teacher/AnalyticsPage";
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
        <Route path="/verify" element={<VerifyCertificatePage />} />
        <Route path="/verify/:certificateId" element={<VerifyCertificatePage />} />
        <Route path="/student" element={<ProtectedRoute role="student"><StudentAutoRedirect /></ProtectedRoute>} />
        <Route path="/student/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
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
        <Route path="/student/certificates" element={<ProtectedRoute role="student"><StudentCertificatesPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><CeoDashboard /></ProtectedRoute>} />
        <Route path="/admin/marketing" element={<ProtectedRoute role="admin"><MarketingDashboard /></ProtectedRoute>} />
        <Route path="/admin/schools" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/teachers" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/classes" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/fees" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/attendance" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute role="admin"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/admin/courses" element={<ProtectedRoute role="admin"><AdminCoursesPage /></ProtectedRoute>} />
        <Route path="/admin/materials" element={<ProtectedRoute role="admin"><UnifiedMaterialsPage shell="admin" /></ProtectedRoute>} />
        <Route path="/admin/materials/:id" element={<ProtectedRoute role="admin"><MaterialViewerPage /></ProtectedRoute>} />
        <Route path="/admin/curriculum" element={<ProtectedRoute role="admin"><AdminCoursesPage /></ProtectedRoute>} />
        <Route path="/admin/quizzes" element={<ProtectedRoute role="admin"><AdminAssessmentManagementPage /></ProtectedRoute>} />
        <Route path="/admin/assessments" element={<ProtectedRoute role="admin"><AdminAssessmentManagementPage /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute role="admin"><AdminSchoolReportsPage /></ProtectedRoute>} />
        <Route path="/admin/progress" element={<ProtectedRoute role="admin"><AdminProgressPage /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AdminAnalyticsPage /></ProtectedRoute>} />
        <Route path="/admin/ai-tutor" element={<ProtectedRoute role="admin"><AdminAiTutorPage /></ProtectedRoute>} />
        <Route path="/admin/competitions" element={<ProtectedRoute role="admin"><AdminCompetitionsPage /></ProtectedRoute>} />
        <Route path="/admin/certificates" element={<ProtectedRoute role="admin"><AdminCertificatesPage /></ProtectedRoute>} />
        <Route path="/admin/certificates/:section" element={<ProtectedRoute role="admin"><AdminCertificatesPage /></ProtectedRoute>} />
        <Route path="/admin/content" element={<ProtectedRoute role="admin"><UnifiedCurriculumPage shell="admin" /></ProtectedRoute>} />
        <Route path="/cto" element={<ProtectedRoute role="cto"><CeoDashboard /></ProtectedRoute>} />
        <Route path="/cto/marketing" element={<ProtectedRoute role="cto"><MarketingDashboard /></ProtectedRoute>} />
        <Route path="/cto/schools" element={<ProtectedRoute role="cto"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/cto/teachers" element={<ProtectedRoute role="cto"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/cto/classes" element={<ProtectedRoute role="cto"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/cto/students" element={<ProtectedRoute role="cto"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/cto/attendance" element={<ProtectedRoute role="cto"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/cto/fees" element={<ProtectedRoute role="cto"><Navigate to="/cto/students" replace /></ProtectedRoute>} />
        <Route path="/cto/notifications" element={<ProtectedRoute role="cto"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/cto/settings" element={<ProtectedRoute role="cto"><AdminSchoolsPage /></ProtectedRoute>} />
        <Route path="/cto/courses" element={<ProtectedRoute role="cto"><AdminCoursesPage /></ProtectedRoute>} />
        <Route path="/cto/materials" element={<ProtectedRoute role="cto"><UnifiedMaterialsPage shell="admin" /></ProtectedRoute>} />
        <Route path="/cto/materials/:id" element={<ProtectedRoute role="cto"><MaterialViewerPage /></ProtectedRoute>} />
        <Route path="/cto/curriculum" element={<ProtectedRoute role="cto"><AdminCoursesPage /></ProtectedRoute>} />
        <Route path="/cto/quizzes" element={<ProtectedRoute role="cto"><AdminAssessmentManagementPage /></ProtectedRoute>} />
        <Route path="/cto/assessments" element={<ProtectedRoute role="cto"><AdminAssessmentManagementPage /></ProtectedRoute>} />
        <Route path="/cto/reports" element={<ProtectedRoute role="cto"><AdminSchoolReportsPage /></ProtectedRoute>} />
        <Route path="/cto/progress" element={<ProtectedRoute role="cto"><AdminProgressPage /></ProtectedRoute>} />
        <Route path="/cto/analytics" element={<ProtectedRoute role="cto"><AdminAnalyticsPage /></ProtectedRoute>} />
        <Route path="/cto/certificates" element={<ProtectedRoute role="cto"><AdminCertificatesPage /></ProtectedRoute>} />
        <Route path="/cto/certificates/:section" element={<ProtectedRoute role="cto"><AdminCertificatesPage /></ProtectedRoute>} />
        <Route path="/cto/ai-tutor" element={<ProtectedRoute role="cto"><AdminAiTutorPage /></ProtectedRoute>} />
        <Route path="/cto/competitions" element={<ProtectedRoute role="cto"><AdminCompetitionsPage /></ProtectedRoute>} />
        <Route path="/cto/content" element={<ProtectedRoute role="cto"><UnifiedCurriculumPage shell="admin" /></ProtectedRoute>} />
        <Route path="/cmo" element={<ProtectedRoute role="cmo"><MarketingDashboard /></ProtectedRoute>} />
        <Route path="/cmo/:section" element={<ProtectedRoute role="cmo"><MarketingDashboard /></ProtectedRoute>} />
        <Route path="/teacher/materials/:id" element={<ProtectedRoute role="teacher"><MaterialViewerPage /></ProtectedRoute>} />
        <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherShell /></ProtectedRoute>}>
          <Route index element={<TeacherDashboard />} />
          <Route path="schools" element={<AdminSchoolsPage mode="teacher" />} />
          <Route path="classes" element={<AdminSchoolsPage mode="teacher" />} />
          <Route path="classes/:id" element={<ClassDetailsPage />} />
          <Route path="students" element={<AdminSchoolsPage mode="teacher" />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="work-log" element={<DailyWorkLogPage />} />
          <Route path="fees" element={<AdminSchoolsPage mode="teacher" />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="quizzes" element={<TeacherQuizAssessmentPage />} />
          <Route path="assessments" element={<TeacherQuizAssessmentPage />} />
          <Route path="certificates" element={<TeacherCertificatesPage />} />
          <Route path="certificates/:section" element={<TeacherCertificatesPage />} />
          <Route path="materials" element={<UnifiedMaterialsPage shell="teacher" />} />
          <Route path="lessons" element={<UnifiedCurriculumPage shell="teacher" />} />
          <Route path="coding" element={<CodingPage />} />
          <Route path="codelab" element={<CodingPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="reports" element={<TeacherReportsPage />} />
          <Route path="messages" element={<AdminSchoolsPage mode="teacher" />} />
          <Route path="profile" element={<TeacherProfilePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
  </ErrorBoundary>
);

export default App;
