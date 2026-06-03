import { BookOpen, Code, FileText, GraduationCap, LayoutDashboard, type LucideIcon } from "lucide-react";

export type StudentNavModule = "dashboard" | "lessons" | "materials" | "quiz" | "tests" | "codelab";

export const studentNavConfig: Record<StudentNavModule, { label: string; href: string; icon: LucideIcon }> = {
  dashboard: { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  lessons: { label: "Lessons", href: "/student/lessons", icon: BookOpen },
  materials: { label: "Materials", href: "/student/materials", icon: FileText },
  quiz: { label: "Quiz", href: "/student/quizzes", icon: GraduationCap },
  tests: { label: "Tests", href: "/student/tests", icon: GraduationCap },
  codelab: { label: "Code Lab", href: "/student/code", icon: Code }
};

export const studentNavOrder: StudentNavModule[] = ["dashboard", "lessons", "materials", "quiz", "tests", "codelab"];

export const studentDefaultModules: StudentNavModule[] = ["dashboard", "lessons", "materials", "quiz", "tests"];

export function getStudentNavItems(enabledModules: StudentNavModule[] = []) {
  const allowed = new Set(enabledModules.length ? enabledModules : studentDefaultModules);
  return studentNavOrder.filter((module) => allowed.has(module)).map((module) => studentNavConfig[module]);
}

export function getStudentLandingRoute(allowedRoutes: string[] = []) {
  if (allowedRoutes.includes("/student/dashboard")) return "/student/dashboard";
  if (allowedRoutes.includes("/student/lessons")) return "/student/lessons";
  if (allowedRoutes.includes("/student/materials")) return "/student/materials";
  if (allowedRoutes.includes("/student/quizzes")) return "/student/quizzes";
  if (allowedRoutes.includes("/student/tests")) return "/student/tests";
  if (allowedRoutes.includes("/student/code")) return "/student/code";
  return "/student/lessons";
}
