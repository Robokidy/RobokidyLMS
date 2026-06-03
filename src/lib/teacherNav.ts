import { Bell, BookMarked, BookText, Building2, CalendarCheck, ClipboardList, CreditCard, FileQuestion, GraduationCap, LayoutDashboard, Medal, UserCircle, Users, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TeacherNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
  description: string;
};

export const teacherNavItems: TeacherNavItem[] = [
  { label: "Dashboard", href: "/teacher", icon: LayoutDashboard, permissions: [], description: "Enterprise dashboard for assigned operations and shared academic content." },
  { label: "Schools", href: "/teacher/schools", icon: Building2, permissions: [], description: "Assigned school overview with classes, students, attendance, and fee signals." },
  { label: "Classes", href: "/teacher/classes", icon: GraduationCap, permissions: [], description: "Manage all your assigned classes and drill into class details." },
  { label: "Students", href: "/teacher/students", icon: Users, permissions: ["students:view", "students:manage"], description: "Search, filter and manage student records with independent state." },
  { label: "Attendance", href: "/teacher/attendance", icon: CalendarCheck, permissions: ["attendance"], description: "Track attendance, reports and class-wide attendance trends." },
  { label: "Fees", href: "/teacher/fees", icon: CreditCard, permissions: [], description: "Manage fee status for assigned students." },
  { label: "Lessons", href: "/teacher/lessons", icon: BookText, permissions: [], description: "Create, edit, assign, preview, and publish shared lessons." },
  { label: "Materials", href: "/teacher/materials", icon: BookMarked, permissions: ["materials"], description: "Upload and manage course materials per subject and class." },
  { label: "Quiz Center", href: "/teacher/quizzes", icon: FileQuestion, permissions: [], description: "Shared question bank and quiz library." },
  { label: "Assessment Center", href: "/teacher/assessments", icon: ClipboardList, permissions: [], description: "Create tests, assign assessments, manage the question bank, and review results." },
  { label: "Certificates", href: "/teacher/certificates", icon: Medal, permissions: [], description: "Issue and review certificates for assigned students." },
  { label: "Reports", href: "/teacher/reports", icon: BarChart3, permissions: [], description: "Attendance, fee, quiz, assessment, and performance reporting." },
  { label: "Notifications", href: "/teacher/messages", icon: Bell, permissions: ["messages"], description: "Broadcast announcements and communicate with class groups." },
  { label: "Profile", href: "/teacher/profile", icon: UserCircle, permissions: [], description: "Teacher profile and assigned access summary." }
];

export function getTeacherNavItems(user?: { permissions?: string[] }) {
  if (!user?.permissions?.length) return teacherNavItems;
  const granted = new Set(user.permissions || []);
  return teacherNavItems.filter((item) => item.permissions.length === 0 || item.permissions.some((permission) => granted.has(permission)));
}
