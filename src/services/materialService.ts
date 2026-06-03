import { API_BASE, apiFetch } from "@/api/client";
import type { Material, MaterialType } from "@/types";

export interface MaterialUploadParams {
  title: string;
  description: string;
  courseId: string;
  type: MaterialType;
  language: "en" | "ta" | "both";
  fileName?: string;
  schoolId?: string;
  grade?: string;
  classSectionIds?: string[];
  tags?: string[];
  status?: string;
  visibility?: string;
  assignments?: Array<{ type: string; refId?: string; label?: string }>;
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

    const response = await apiFetch(`/materials${params.toString() ? "?" + params.toString() : ""}`, {}, token);
    return response.data || response;
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

    const response = await apiFetch(`/materials${params.toString() ? "?" + params.toString() : ""}`, {}, token);
    return response.data || response;
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
    const base = role === "student" ? "/student/materials" : "/materials";
    return apiFetch(`${base}/${id}`, {}, token);
  }

  /**
   * Create/upload new material (admin or teacher)
   */
  static async uploadMaterial(
    file: File,
    params: MaterialUploadParams,
    token: string,
    role: "admin" | "teacher" = "admin",
    onProgress?: (progress: number) => void
  ): Promise<Material> {
    const body = new FormData();
    body.append("file", file);
    body.append("title", params.title);
    body.append("description", params.description);
    body.append("courseId", params.courseId);
    body.append("type", params.type);
    body.append("language", params.language);
    body.append("fileName", params.fileName || file.name);
    if (params.schoolId) body.append("schoolId", params.schoolId);
    if (params.grade) body.append("grade", params.grade);
    if (params.classSectionIds?.length) body.append("classSectionIds", JSON.stringify(params.classSectionIds));
    if (params.tags?.length) body.append("tags", JSON.stringify(params.tags));
    if (params.status) body.append("status", params.status);
    if (params.visibility) body.append("visibility", params.visibility);
    if (params.assignments?.length) body.append("assignments", JSON.stringify(params.assignments));

    const data = await new Promise<Material>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/materials/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        const content = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100);
          resolve(content);
        } else {
          reject(new Error(content.message || content.error || "Upload failed"));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed. Check your API URL and network connection."));
      xhr.ontimeout = () => reject(new Error("Upload timed out. Please try again."));
      xhr.timeout = 10 * 60 * 1000;
      xhr.send(body);
    });
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
    return apiFetch(`/materials/${id}`, { method: "PUT", body: updates }, token);
  }

  /**
   * Delete/disable material (admin or teacher)
   */
  static async deleteMaterial(id: string, token: string, role: "admin" | "teacher" = "admin"): Promise<void> {
    return apiFetch(`/materials/${id}`, { method: "DELETE" }, token);
  }

  /**
   * Bulk operations
   */
  static async deleteMultipleMaterials(ids: string[], token: string, role: "admin" | "teacher" = "admin"): Promise<void> {
    await Promise.all(ids.map((id) => MaterialService.deleteMaterial(id, token, role)));
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
    return apiFetch(`/materials/stats`, {}, token);
  }
}
