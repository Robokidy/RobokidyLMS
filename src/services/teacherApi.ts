import { apiFetch } from "@/api/client";

type QueryParams = Record<string, string | number | boolean | undefined>;

function buildQuery(params: QueryParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export const teacherApi = {
  dashboard(token?: string) {
    return apiFetch("/teacher/dashboard", {}, token);
  },
  classes(token?: string) {
    return apiFetch("/teacher/classes", {}, token);
  },
  students(token?: string) {
    return apiFetch("/teacher/students", {}, token);
  },
  attendance(params: QueryParams = {}, token?: string) {
    return apiFetch(`/teacher/attendance${buildQuery(params)}`, {}, token);
  },
  assignments(params: QueryParams = {}, token?: string) {
    return apiFetch(`/teacher/assignments${buildQuery(params)}`, {}, token);
  },
  materials(params: QueryParams = {}, token?: string) {
    return apiFetch(`/teacher/materials${buildQuery(params)}`, {}, token);
  },
  courses(token?: string) {
    return apiFetch("/teacher/courses", {}, token);
  },
  createStudent(payload: any, token?: string) {
    return apiFetch("/teacher/students", { method: "POST", body: JSON.stringify(payload) }, token);
  },
  updateStudent(id: string, payload: any, token?: string) {
    return apiFetch(`/teacher/students/${id}`, { method: "PUT", body: JSON.stringify(payload) }, token);
  },
  deactivateStudent(id: string, token?: string) {
    return apiFetch(`/teacher/students/${id}`, { method: "DELETE" }, token);
  },
  createAssignment(payload: any, token?: string) {
    return apiFetch("/teacher/assignments", { method: "POST", body: JSON.stringify(payload) }, token);
  },
  announcement(payload: { title: string; body: string; classSectionId?: string }, token?: string) {
    return apiFetch("/teacher/announcements", { method: "POST", body: JSON.stringify(payload) }, token);
  }
};
