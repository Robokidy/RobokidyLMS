import { apiFetch } from "@/api/client";

/**
 * Unified Content Service
 * Used by Admin, Teacher, and Student for all content operations
 * Handles automatic role-based filtering on backend
 */

export interface ContentFilter {
  courseId?: string;
  search?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

// ============================================================================
// LESSONS
// ============================================================================

export const LessonService = {
  /**
   * Get all lessons (filtered by user role)
   */
  async getAll(token: string, filters: ContentFilter = {}): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams();
    if (filters.courseId) params.append("courseId", filters.courseId);
    if (filters.search) params.append("search", filters.search);
    if (filters.status) params.append("status", filters.status);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit || 20));

    return apiFetch(`/content/lessons?${params.toString()}`, {}, token);
  },

  /**
   * Get single lesson
   */
  async getById(id: string, token: string): Promise<any> {
    return apiFetch(`/content/lessons/${id}`, {}, token);
  },

  /**
   * Create new lesson
   */
  async create(data: any, token: string): Promise<any> {
    return apiFetch(`/content/lessons`, { method: "POST", body: data }, token);
  },

  /**
   * Update lesson
   */
  async update(id: string, data: any, token: string): Promise<any> {
    return apiFetch(`/content/lessons/${id}`, { method: "PUT", body: data }, token);
  },

  /**
   * Delete lesson
   */
  async delete(id: string, token: string): Promise<void> {
    return apiFetch(`/content/lessons/${id}`, { method: "DELETE" }, token);
  },

  /**
   * Reorder lessons (drag & drop)
   */
  async reorder(lessonIds: string[], token: string): Promise<void> {
    return apiFetch(`/content/lessons/reorder`, {
      method: "POST",
      body: { lessonIds }
    }, token);
  },

  /**
   * Publish lesson
   */
  async publish(id: string, token: string): Promise<any> {
    return apiFetch(`/content/lessons/${id}`, {
      method: "PUT",
      body: { isPublished: true, status: "published" }
    }, token);
  },

  /**
   * Unpublish lesson
   */
  async unpublish(id: string, token: string): Promise<any> {
    return apiFetch(`/content/lessons/${id}`, {
      method: "PUT",
      body: { isPublished: false, status: "draft" }
    }, token);
  }
};

// ============================================================================
// MATERIALS
// ============================================================================

export const MaterialService = {
  /**
   * Get all materials (filtered by user role)
   */
  async getAll(token: string, filters: ContentFilter = {}): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams();
    if (filters.courseId) params.append("courseId", filters.courseId);
    if (filters.type) params.append("type", filters.type);
    if (filters.search) params.append("search", filters.search);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit || 20));

    return apiFetch(`/content/materials?${params.toString()}`, {}, token);
  },

  /**
   * Get single material
   */
  async getById(id: string, token: string): Promise<any> {
    return apiFetch(`/content/materials/${id}`, {}, token);
  },

  /**
   * Create material
   */
  async create(data: any, token: string): Promise<any> {
    return apiFetch(`/content/materials`, { method: "POST", body: data }, token);
  },

  /**
   * Update material
   */
  async update(id: string, data: any, token: string): Promise<any> {
    return apiFetch(`/content/materials/${id}`, { method: "PUT", body: data }, token);
  },

  /**
   * Delete material
   */
  async delete(id: string, token: string): Promise<void> {
    return apiFetch(`/content/materials/${id}`, { method: "DELETE" }, token);
  },

  /**
   * Publish material
   */
  async publish(id: string, token: string): Promise<any> {
    return apiFetch(`/content/materials/${id}`, {
      method: "PUT",
      body: { isPublished: true }
    }, token);
  },

  /**
   * Unpublish material
   */
  async unpublish(id: string, token: string): Promise<any> {
    return apiFetch(`/content/materials/${id}`, {
      method: "PUT",
      body: { isPublished: false }
    }, token);
  }
};

// ============================================================================
// QUIZZES
// ============================================================================

export const QuizService = {
  /**
   * Get all quizzes
   */
  async getAll(token: string, filters: ContentFilter = {}): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams();
    if (filters.courseId) params.append("courseId", filters.courseId);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit || 20));

    return apiFetch(`/content/quizzes?${params.toString()}`, {}, token);
  },

  /**
   * Get single quiz
   */
  async getById(id: string, token: string): Promise<any> {
    return apiFetch(`/content/quizzes/${id}`, {}, token);
  },

  /**
   * Create quiz
   */
  async create(data: any, token: string): Promise<any> {
    return apiFetch(`/content/quizzes`, { method: "POST", body: data }, token);
  },

  /**
   * Update quiz
   */
  async update(id: string, data: any, token: string): Promise<any> {
    return apiFetch(`/content/quizzes/${id}`, { method: "PUT", body: data }, token);
  },

  /**
   * Delete quiz
   */
  async delete(id: string, token: string): Promise<void> {
    return apiFetch(`/content/quizzes/${id}`, { method: "DELETE" }, token);
  },

  /**
   * Publish quiz
   */
  async publish(id: string, token: string): Promise<any> {
    return apiFetch(`/content/quizzes/${id}`, {
      method: "PUT",
      body: { isPublished: true, status: "published" }
    }, token);
  }
};

// ============================================================================
// ASSIGNMENTS
// ============================================================================

export const AssignmentService = {
  /**
   * Get all assignments
   */
  async getAll(token: string, filters: ContentFilter = {}): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams();
    if (filters.courseId) params.append("courseId", filters.courseId);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit || 20));

    return apiFetch(`/content/assignments?${params.toString()}`, {}, token);
  },

  /**
   * Get single assignment
   */
  async getById(id: string, token: string): Promise<any> {
    return apiFetch(`/content/assignments/${id}`, {}, token);
  },

  /**
   * Create assignment
   */
  async create(data: any, token: string): Promise<any> {
    return apiFetch(`/content/assignments`, { method: "POST", body: data }, token);
  },

  /**
   * Update assignment
   */
  async update(id: string, data: any, token: string): Promise<any> {
    return apiFetch(`/content/assignments/${id}`, { method: "PUT", body: data }, token);
  },

  /**
   * Delete assignment
   */
  async delete(id: string, token: string): Promise<void> {
    return apiFetch(`/content/assignments/${id}`, { method: "DELETE" }, token);
  },

  /**
   * Publish assignment
   */
  async publish(id: string, token: string): Promise<any> {
    return apiFetch(`/content/assignments/${id}`, {
      method: "PUT",
      body: { isPublished: true, status: "published" }
    }, token);
  }
};
