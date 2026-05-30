import { Bell, BookMarked, BookOpen, CalendarCheck, ClipboardList, LayoutDashboard, Users, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TeacherNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
  description: string;
};

export const teacherNavItems: TeacherNavItem[] = [
  { label: "Overview", href: "/teacher", icon: LayoutDashboard, permissions: [], description: "High level classroom metrics, notifications and upcoming activities." },
  { label: "Classes", href: "/teacher/classes", icon: GraduationCap, permissions: ["classes:manage", "students:view"], description: "Manage all your assigned classes and drill into class details." },
  { label: "Students", href: "/teacher/students", icon: Users, permissions: ["students:view", "students:manage"], description: "Search, filter and manage student records with independent state." },
  { label: "Attendance", href: "/teacher/attendance", icon: CalendarCheck, permissions: ["attendance"], description: "Track attendance, reports and class-wide attendance trends." },
  { label: "Assessment Center", href: "/teacher/assessments", icon: ClipboardList, permissions: ["assignments", "coding", "analytics"], description: "Create tests, assign assessments, manage the question bank, and review results." },
  { label: "Materials", href: "/teacher/materials", icon: BookMarked, permissions: ["materials"], description: "Upload and manage course materials per subject and class." },
  { label: "Curriculum", href: "/teacher/curriculum", icon: BookOpen, permissions: ["materials", "coding"], description: "Create and organize lessons, topics, and learning objectives." },
  { label: "Messages", href: "/teacher/messages", icon: Bell, permissions: ["messages"], description: "Broadcast announcements and communicate with class groups." }
];

export function getTeacherNavItems(user?: { permissions?: string[] }) {
  if (!user?.permissions?.length) return teacherNavItems.filter((item) => !item.permissions.length);
  const granted = new Set(user.permissions || []);
  return teacherNavItems.filter((item) => item.permissions.length === 0 || item.permissions.some((permission) => granted.has(permission)));
}
