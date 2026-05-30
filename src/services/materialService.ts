import { API_BASE, apiFetch } from "@/api/client";
import type { Material, MaterialType } from "@/types";

export interface MaterialUploadParams {
  title: string;
  description: string;
  courseId: string;
  type: MaterialType;
  language: "en" | "ta" | "both";
  fileName?: string;
}

export interface MaterialFilters {
  search?: string;
  type?: MaterialType;
  courseId?: string;
  page?: number;
  limit?: number;
}

/**
 * Shared Material Service - Used by both Admin and Teacher
 * Handles all material CRUD operations
 */
export class MaterialService {
  /**
   * Get materials for admin
   */
  static async getAdminMaterials(token: string, filters?: MaterialFilters): Promise<Material[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.courseId) params.append("courseId", filters.courseId);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));

    return apiFetch(`/admin/materials${params.toString() ? "?" + params.toString() : ""}`, {}, token);
  }

  /**
   * Get materials for teacher (limited to their school/class)
   */
  static async getTeacherMaterials(token: string, filters?: MaterialFilters): Promise<Material[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.courseId) params.append("courseId", filters.courseId);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));

    return apiFetch(`/teacher/materials${params.toString() ? "?" + params.toString() : ""}`, {}, token);
  }

  /**
   * Get materials for student (only assigned courses)
   */
  static async getStudentMaterials(token: string, filters?: MaterialFilters): Promise<Material[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));

    return apiFetch(`/student/materials${params.toString() ? "?" + params.toString() : ""}`, {}, token);
  }

  /**
   * Get single material by ID
   */
  static async getMaterial(id: string, token: string, role: "admin" | "teacher" | "student" = "student"): Promise<Material> {
    return apiFetch(`/${role}/materials/${id}`, {}, token);
  }

  /**
   * Create/upload new material (admin or teacher)
   */
  static async uploadMaterial(
    file: File,
    params: MaterialUploadParams,
    token: string,
    role: "admin" | "teacher" = "admin"
  ): Promise<Material> {
    const urlParams = new URLSearchParams({
      title: params.title,
      description: params.description,
      courseId: params.courseId,
      type: params.type,
      language: params.language,
      fileName: params.fileName || file.name
    });

    const res = await fetch(`${API_BASE}/${role}/materials?${urlParams.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        Authorization: `Bearer ${token}`
      },
      body: file
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Upload failed");
    return data;
  }

  /**
   * Update material metadata (admin or teacher)
   */
  static async updateMaterial(
    id: string,
    updates: Partial<Material>,
    token: string,
    role: "admin" | "teacher" = "admin"
  ): Promise<Material> {
    return apiFetch(`/${role}/materials/${id}`, { method: "PUT", body: updates }, token);
  }

  /**
   * Delete/disable material (admin or teacher)
   */
  static async deleteMaterial(id: string, token: string, role: "admin" | "teacher" = "admin"): Promise<void> {
    return apiFetch(`/${role}/materials/${id}`, { method: "DELETE" }, token);
  }

  /**
   * Bulk operations
   */
  static async deleteMultipleMaterials(ids: string[], token: string, role: "admin" | "teacher" = "admin"): Promise<void> {
    return apiFetch(`/${role}/materials/bulk-delete`, { method: "POST", body: { ids } }, token);
  }

  /**
   * Material statistics
   */
  static async getMaterialStats(token: string, role: "admin" | "teacher" = "admin"): Promise<{
    total: number;
    active: number;
    byType: Record<string, number>;
    byLanguage: Record<string, number>;
  }> {
    return apiFetch(`/${role}/materials/stats`, {}, token);
  }
}
