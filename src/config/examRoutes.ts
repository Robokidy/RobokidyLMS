/**
 * Exam Module Routes Configuration
 * Add these routes to your main App.tsx or router configuration
 * 
 * Usage:
 * 1. Import all exam components
 * 2. Add routes in your React Router configuration
 * 3. Update navigation menus
 * 4. Update user type-specific sidebars
 */

// ==================== IMPORTS ====================

// Student Routes
import { StudentTestsPage } from "@/pages/student/StudentTestsPage";
import { ExamStartPage } from "@/pages/student/ExamStartPage";
import { ExamWindow } from "@/pages/student/ExamWindowPage";
import { StudentExamResultPage } from "@/pages/student/StudentExamResultPage";

// Teacher Routes
import { TeacherTestsPage } from "@/pages/teacher/TeacherTestsPage";
// TODO: Import remaining teacher pages when created
// import { TeacherTestCreatePage } from "@/pages/teacher/TeacherTestCreatePage";
// import { TeacherTestAssignPage } from "@/pages/teacher/TeacherTestAssignPage";
// import { TeacherReportsDashboard } from "@/pages/teacher/TeacherReportsDashboard";

// Admin Routes
import { AdminExamAnalyticsPage } from "@/pages/admin/AdminExamAnalyticsPage";
// TODO: Import remaining admin pages when created
// import { AdminStudentRankings } from "@/pages/admin/AdminStudentRankings";
// import { AdminCheatingReports } from "@/pages/admin/AdminCheatingReports";

// ==================== ROUTING CONFIGURATION ====================

/**
 * React Router Configuration
 * Add these routes to your main router setup in App.tsx or your routing file
 */

export const examModuleRoutes = [
  // ============= STUDENT ROUTES =============
  {
    path: "/student/tests",
    element: <StudentTestsPage />,
    meta: { requiresAuth: true, roles: ["student"] },
  },
  {
    path: "/student/exams/:testId/start",
    element: <ExamStartPage />,
    meta: { requiresAuth: true, roles: ["student"] },
  },
  {
    path: "/student/exams/:testId/exam",
    element: <ExamWindow />,
    meta: { requiresAuth: true, roles: ["student"] },
  },
  {
    path: "/student/exams/:testId/continue",
    element: <ExamWindow />,
    meta: { requiresAuth: true, roles: ["student"] },
  },
  {
    path: "/student/exams/:testId/result",
    element: <StudentExamResultPage />,
    meta: { requiresAuth: true, roles: ["student"] },
  },

  // ============= TEACHER ROUTES =============
  {
    path: "/teacher/tests",
    element: <TeacherTestsPage />,
    meta: { requiresAuth: true, roles: ["teacher", "admin"] },
  },
  {
    path: "/teacher/tests/create",
    element: null, // TODO: Import and use TeacherTestCreatePage
    meta: { requiresAuth: true, roles: ["teacher", "admin"] },
  },
  {
    path: "/teacher/tests/:testId/edit",
    element: null, // TODO: Import and use TeacherTestCreatePage
    meta: { requiresAuth: true, roles: ["teacher", "admin"] },
  },
  {
    path: "/teacher/tests/:testId/assign",
    element: null, // TODO: Import and use TeacherTestAssignPage
    meta: { requiresAuth: true, roles: ["teacher", "admin"] },
  },
  {
    path: "/teacher/tests/:testId/reports",
    element: null, // TODO: Import and use TeacherReportsDashboard
    meta: { requiresAuth: true, roles: ["teacher", "admin"] },
  },

  // ============= ADMIN ROUTES =============
  {
    path: "/admin/exams/analytics",
    element: <AdminExamAnalyticsPage />,
    meta: { requiresAuth: true, roles: ["admin"] },
  },
  {
    path: "/admin/exams/rankings",
    element: null, // TODO: Import and use AdminStudentRankings
    meta: { requiresAuth: true, roles: ["admin"] },
  },
  {
    path: "/admin/exams/violations",
    element: null, // TODO: Import and use AdminCheatingReports
    meta: { requiresAuth: true, roles: ["admin"] },
  },
];

// ==================== SIDEBAR NAVIGATION ITEMS ====================

/**
 * Add these navigation items to the appropriate user role sidebars
 */

// STUDENT SIDEBAR
export const studentExamNavItems = {
  label: "Exams",
  icon: "FileText", // Or your icon component
  submenu: [
    {
      label: "My Tests",
      path: "/student/tests",
      icon: "ClipboardList",
    },
  ],
};

// TEACHER SIDEBAR
export const teacherExamNavItems = {
  label: "Exams & Tests",
  icon: "BookOpen",
  submenu: [
    {
      label: "My Tests",
      path: "/teacher/tests",
      icon: "List",
    },
    {
      label: "Create Test",
      path: "/teacher/tests/create",
      icon: "Plus",
    },
  ],
};

// ADMIN SIDEBAR
export const adminExamNavItems = {
  label: "Exams & Assessment",
  icon: "Zap",
  submenu: [
    {
      label: "Analytics",
      path: "/admin/exams/analytics",
      icon: "BarChart3",
    },
    {
      label: "Rankings",
      path: "/admin/exams/rankings",
      icon: "Award",
    },
    {
      label: "Violations",
      path: "/admin/exams/violations",
      icon: "AlertTriangle",
    },
  ],
};

// ==================== APP.TSX INTEGRATION EXAMPLE ====================

/**
 * Example integration in App.tsx:
 * 
 * import { createBrowserRouter, RouterProvider } from 'react-router-dom';
 * import { examModuleRoutes } from '@/config/examRoutes';
 * import { AuthLayout } from '@/layouts/AuthLayout';
 * 
 * const router = createBrowserRouter([
 *   {
 *     path: "/",
 *     element: <AuthLayout />,
 *     children: [
 *       // ... existing routes ...
 *       
 *       // Add exam module routes
 *       ...examModuleRoutes,
 *       
 *       // ... other routes ...
 *     ],
 *   },
 * ]);
 * 
 * export function App() {
 *   return <RouterProvider router={router} />;
 * }
 */

// ==================== PROTECTED ROUTE WRAPPER ====================

/**
 * Use this component to protect routes based on user role
 * Example:
 * <ProtectedRoute 
 *   element={<StudentTestsPage />} 
 *   requiredRoles={["student"]}
 *   requiredAuth={true}
 * />
 */

export interface ProtectedRouteProps {
  element: React.ReactElement;
  requiredRoles?: string[];
  requiredAuth?: boolean;
}

// ==================== UTILITY HOOKS ====================

/**
 * Hook to check if user can access exam module
 */
export const useCanAccessExams = () => {
  // const { user } = useAuth();
  // return ["student", "teacher", "admin", "parent"].includes(user?.role);
};

/**
 * Hook to check if user can create tests
 */
export const useCanCreateTests = () => {
  // const { user } = useAuth();
  // return ["teacher", "admin"].includes(user?.role);
};

/**
 * Hook to check if user can view analytics
 */
export const useCanViewAnalytics = () => {
  // const { user } = useAuth();
  // return ["teacher", "admin"].includes(user?.role);
};

// ==================== BREADCRUMB CONFIGURATION ====================

/**
 * Breadcrumb paths for navigation
 */

export const examBreadcrumbs = {
  studentTests: [
    { label: "Home", path: "/" },
    { label: "Tests", path: "/student/tests" },
  ],
  examStart: [
    { label: "Home", path: "/" },
    { label: "Tests", path: "/student/tests" },
    { label: "Exam Instructions", path: null },
  ],
  examWindow: [
    { label: "Home", path: "/" },
    { label: "Tests", path: "/student/tests" },
    { label: "Exam In Progress", path: null },
  ],
  examResult: [
    { label: "Home", path: "/" },
    { label: "Tests", path: "/student/tests" },
    { label: "Results", path: null },
  ],
  teacherTests: [
    { label: "Home", path: "/" },
    { label: "Tests", path: "/teacher/tests" },
  ],
  adminAnalytics: [
    { label: "Home", path: "/" },
    { label: "Analytics", path: "/admin/exams/analytics" },
  ],
};

// ==================== QUICK ACCESS NAVIGATION ====================

/**
 * Quick links that might appear in dashboard or home page
 */

export const examQuickLinks = {
  student: [
    {
      title: "Take Test",
      description: "View and attempt assigned tests",
      icon: "Play",
      path: "/student/tests",
    },
  ],
  teacher: [
    {
      title: "My Tests",
      description: "Create and manage your exams",
      icon: "BookOpen",
      path: "/teacher/tests",
    },
    {
      title: "Create New Test",
      description: "Create a new test from scratch",
      icon: "Plus",
      path: "/teacher/tests/create",
    },
  ],
  admin: [
    {
      title: "Exam Analytics",
      description: "View comprehensive exam statistics",
      icon: "BarChart3",
      path: "/admin/exams/analytics",
    },
    {
      title: "Student Rankings",
      description: "View student performance rankings",
      icon: "Award",
      path: "/admin/exams/rankings",
    },
    {
      title: "Violations Report",
      description: "Review anti-cheating incidents",
      icon: "AlertTriangle",
      path: "/admin/exams/violations",
    },
  ],
};

// ==================== KEYBOARD SHORTCUTS ====================

/**
 * Keyboard shortcuts for exam interface
 */

export const examKeyboardShortcuts = {
  /* These are disabled during exam to prevent cheating:
  F12: Developer Tools
  Ctrl+Shift+I: Inspector
  Ctrl+Shift+C: Inspect Element
  Ctrl+P: Print
  Ctrl+S: Save
  */

  // Allowed shortcuts:
  ESC: "Exit fullscreen (if permitted)",
  SPACE: "Check/Uncheck option",
  TAB: "Navigate to next question",
  SHIFT_TAB: "Navigate to previous question",
};

// ==================== TOAST NOTIFICATIONS ====================

/**
 * Common toast messages for exam module
 */

export const examToastMessages = {
  testStarted: "Exam started successfully",
  testSubmitted: "Exam submitted successfully",
  answerSaved: "Answer saved",
  reviewMarked: "Question marked for review",
  violationDetected: "Suspicious activity detected",
  timeWarning: "5 minutes remaining",
  timeAlmostUp: "1 minute remaining",
  testTimeExpired: "Time's up! Your exam has been auto-submitted",
  networkError: "Network error. Please check your connection",
  autoSaveError: "Failed to auto-save. Please try again",
};

// ==================== API RATE LIMITING ====================

/**
 * Rate limit configuration for exam APIs
 */

export const examApiRateLimits = {
  startTest: "1 per minute per user",
  saveAnswer: "Unlimited",
  submitTest: "1 per minute per user",
  reportViolation: "Unlimited",
  getAttempt: "No limit",
};

// ==================== ERROR MESSAGES ====================

export const examErrorMessages = {
  testNotFound: "Test not found or has been deleted",
  unauthorizedAccess: "You don't have permission to access this test",
  testNotStarted: "This test has not started yet",
  testExpired: "This test has expired",
  alreadySubmitted: "You have already submitted this test",
  maxAttemptsReached: "You have reached the maximum number of attempts",
  networkError: "Network connection lost. Please check your internet",
  invalidToken: "Your session has expired. Please log in again",
  saveFailed: "Failed to save your answer. Please try again",
  submitFailed: "Failed to submit the test. Please try again",
};

export default {
  examModuleRoutes,
  studentExamNavItems,
  teacherExamNavItems,
  adminExamNavItems,
  examBreadcrumbs,
  examQuickLinks,
  examKeyboardShortcuts,
  examToastMessages,
  examApiRateLimits,
  examErrorMessages,
};
