import { apiFetch } from "@/api/client";
import type { Lesson, Course } from "@/types";

export interface LessonCreateParams {
  title: string;
  content: string;
  courseId: string;
  objectives?: string[];
  duration?: number;
}

export interface CurriculumModuleParams {
  title: string;
  description: string;
  courseId: string;
  lessons: string[];
  order?: number;
}

/**
 * Shared Lesson/Curriculum Service - Used by Admin and Teacher
 * Handles lesson and curriculum management
 */
export class CurriculumService {
  /**
   * Get lessons for admin
   */
  static async getAdminLessons(token: string, courseId?: string): Promise<Lesson[]> {
    const params = courseId ? `?courseId=${courseId}` : "";
    return apiFetch(`/admin/lessons${params}`, {}, token);
  }

  /**
   * Get lessons for teacher (limited to their courses)
   */
  static async getTeacherLessons(token: string, courseId?: string): Promise<Lesson[]> {
    const params = courseId ? `?courseId=${courseId}` : "";
    return apiFetch(`/teacher/lessons${params}`, {}, token);
  }

  /**
   * Get lessons for student (only assigned courses)
   */
  static async getStudentLessons(token: string, courseId?: string): Promise<Lesson[]> {
    const params = courseId ? `?courseId=${courseId}` : "";
    return apiFetch(`/student/lessons${params}`, {}, token);
  }

  /**
   * Get single lesson
   */
  static async getLesson(id: string, token: string, role: "admin" | "teacher" | "student" = "student"): Promise<Lesson> {
    return apiFetch(`/${role}/lessons/${id}`, {}, token);
  }

  /**
   * Create new lesson (admin or teacher)
   */
  static async createLesson(
    params: LessonCreateParams,
    token: string,
    role: "admin" | "teacher" = "admin"
  ): Promise<Lesson> {
    return apiFetch(`/${role}/lessons`, { method: "POST", body: params }, token);
  }

  /**
   * Update lesson (admin or teacher)
   */
  static async updateLesson(
    id: string,
    updates: Partial<Lesson>,
    token: string,
    role: "admin" | "teacher" = "admin"
  ): Promise<Lesson> {
    return apiFetch(`/${role}/lessons/${id}`, { method: "PUT", body: updates }, token);
  }

  /**
   * Delete lesson (admin or teacher)
   */
  static async deleteLesson(id: string, token: string, role: "admin" | "teacher" = "admin"): Promise<void> {
    return apiFetch(`/${role}/lessons/${id}`, { method: "DELETE" }, token);
  }

  /**
   * Reorder lessons (drag & drop)
   */
  static async reorderLessons(
    lessonIds: string[],
    courseId: string,
    token: string,
    role: "admin" | "teacher" = "admin"
  ): Promise<void> {
    return apiFetch(`/${role}/lessons/reorder`, { method: "POST", body: { lessonIds, courseId } }, token);
  }

  /**
   * Get curriculum modules (groupings of lessons)
   */
  static async getModules(token: string, role: "admin" | "teacher" = "admin", courseId?: string): Promise<any[]> {
    const params = courseId ? `?courseId=${courseId}` : "";
    return apiFetch(`/${role}/curriculum/modules${params}`, {}, token);
  }

  /**
   * Create curriculum module
   */
  static async createModule(params: CurriculumModuleParams, token: string, role: "admin" | "teacher" = "admin"): Promise<any> {
    return apiFetch(`/${role}/curriculum/modules`, { method: "POST", body: params }, token);
  }

  /**
   * Update curriculum module
   */
  static async updateModule(
    id: string,
    updates: Partial<CurriculumModuleParams>,
    token: string,
    role: "admin" | "teacher" = "admin"
  ): Promise<any> {
    return apiFetch(`/${role}/curriculum/modules/${id}`, { method: "PUT", body: updates }, token);
  }

  /**
   * Delete curriculum module
   */
  static async deleteModule(id: string, token: string, role: "admin" | "teacher" = "admin"): Promise<void> {
    return apiFetch(`/${role}/curriculum/modules/${id}`, { method: "DELETE" }, token);
  }

  /**
   * Get course curriculum overview
   */
  static async getCourseCurriculum(courseId: string, token: string, role: "admin" | "teacher" = "admin"): Promise<any> {
    return apiFetch(`/${role}/curriculum/courses/${courseId}`, {}, token);
  }
}
