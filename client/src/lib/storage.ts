import api from "./api";

// ─── Student APIs ─────────────────────────────────────────────────────────────
export const fetchStudentDashboard = () => api.get("/students/dashboard").then(r => r.data);
export const fetchStudentProjects = () => api.get("/students/projects").then(r => r.data);
export const fetchStudentReports = () => api.get("/students/reports").then(r => r.data);
export const fetchStudentActivity = () => api.get("/students/activity").then(r => r.data);

// ─── Supervisor APIs ──────────────────────────────────────────────────────────
export const fetchSupervisorDashboard = () => api.get("/supervisors/dashboard").then(r => r.data);
export const fetchReviewQueue = () => api.get("/supervisors/review-queue").then(r => r.data);
export const fetchSupervisorStudents = () => api.get("/supervisors/students").then(r => r.data);
export const fetchSupervisorProject = (id: string) => api.get(`/supervisors/projects/${id}`).then(r => r.data);

// ─── Project APIs ─────────────────────────────────────────────────────────────
export const fetchProjects = (params?: Record<string, any>) => api.get("/projects", { params }).then(r => r.data);
export const fetchProject = (id: string) => api.get(`/projects/${id}`).then(r => r.data);
export const createProject = (data: Record<string, any>) => api.post("/projects", data).then(r => r.data);
export const updateProject = (id: string, data: Record<string, any>) => api.patch(`/projects/${id}`, data).then(r => r.data);
export const deleteProject = (id: string) => api.delete(`/projects/${id}`).then(r => r.data);

export const uploadProjectDocument = (id: string, file: File) => {
  const form = new FormData();
  form.append("document", file);
  return api.post(`/projects/${id}/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
};

export const submitProject = (id: string) => api.post(`/projects/${id}/submit`).then(r => r.data);
export const resubmitProject = (id: string) => api.post(`/projects/${id}/resubmit`).then(r => r.data);
export const fetchProjectVersions = (id: string) => api.get(`/projects/${id}/versions`).then(r => r.data);

// ─── Review APIs ──────────────────────────────────────────────────────────────
export const approveProject = (projectId: string, comments?: string) =>
  api.post(`/reviews/${projectId}/approve`, { comments }).then(r => r.data);
export const requestRevision = (projectId: string, comments: string) =>
  api.post(`/reviews/${projectId}/request-revision`, { comments }).then(r => r.data);
export const rejectProject = (projectId: string, comments?: string) =>
  api.post(`/reviews/${projectId}/reject`, { comments }).then(r => r.data);
export const postComment = (projectId: string, comments: string) =>
  api.post(`/reviews/${projectId}/comment`, { comments }).then(r => r.data);
export const fetchReviewHistory = (projectId: string) =>
  api.get(`/reviews/${projectId}/history`).then(r => r.data);

// ─── Project Supervisor Assignment ───────────────────────────────────────────
export const assignSupervisor = (projectId: string, supervisorId: string) =>
  api.patch(`/projects/${projectId}/assign-supervisor`, { supervisorId }).then(r => r.data);

// ─── Repository APIs ──────────────────────────────────────────────────────────
export const searchRepository = (params?: Record<string, any>) =>
  api.get("/repository/search", { params }).then(r => r.data);
export const fetchRepositoryProjects = (params?: Record<string, any>) =>
  api.get("/repository/projects", { params }).then(r => r.data);
export const fetchRepositoryProject = (id: string) =>
  api.get(`/repository/projects/${id}`).then(r => r.data);
export const fetchRepositoryFilters = () =>
  api.get("/repository/filters").then(r => r.data);
export const getRepositoryDownloadUrl = (id: string) =>
  `${import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"}/repository/projects/${id}/download`;

// ─── Plagiarism APIs ──────────────────────────────────────────────────────────
export const runSimilarityCheck = (projectId: string) =>
  api.post(`/plagiarism/check/${projectId}`).then(r => r.data);
export const fetchSimilarityReport = (projectId: string) =>
  api.get(`/plagiarism/report/${projectId}`).then(r => r.data);
export const fetchSimilarityMatches = (reportId: string) =>
  api.get(`/plagiarism/matches/${reportId}`).then(r => r.data);

// ─── Notification APIs ────────────────────────────────────────────────────────
export const fetchNotifications = () => api.get("/notifications").then(r => r.data);
export const markNotificationRead = (id: string) => api.patch(`/notifications/${id}/read`).then(r => r.data);
export const markAllNotificationsRead = () => api.patch("/notifications/read-all").then(r => r.data);
export const deleteNotification = (id: string) => api.delete(`/notifications/${id}`).then(r => r.data);

// ─── Reports APIs ─────────────────────────────────────────────────────────────
export const fetchReportsDashboard = () => api.get("/reports/dashboard").then(r => r.data);
export const fetchSubmissionTrends = () => api.get("/reports/submission-trends").then(r => r.data);
export const fetchSimilarityTrends = () => api.get("/reports/similarity-trends").then(r => r.data);
export const fetchRepositoryGrowth = () => api.get("/reports/repository-growth").then(r => r.data);
export const fetchDepartmentPerformance = () => api.get("/reports/department-performance").then(r => r.data);

// ─── User Management APIs ─────────────────────────────────────────────────────
export const fetchUsers = (params?: Record<string, any>) => api.get("/users", { params }).then(r => r.data);
export const fetchUser = (id: string) => api.get(`/users/${id}`).then(r => r.data);
export const createUser = (data: Record<string, any>) => api.post("/users", data).then(r => r.data);
export const updateUser = (id: string, data: Record<string, any>) => api.patch(`/users/${id}`, data).then(r => r.data);
export const deleteUser = (id: string) => api.delete(`/users/${id}`).then(r => r.data);
export const updateUserStatus = (id: string, status: string) =>
  api.patch(`/users/${id}/status`, { status }).then(r => r.data);

// ─── Settings APIs ────────────────────────────────────────────────────────────
export const fetchSettings = () => api.get("/settings").then(r => r.data);
export const updateSettings = (data: Record<string, string>) => api.patch("/settings", data).then(r => r.data);

// ─── Audit Log APIs ───────────────────────────────────────────────────────────
export const fetchAuditLogs = (params?: Record<string, any>) => api.get("/audit-logs", { params }).then(r => r.data);

// ─── Lookup APIs ──────────────────────────────────────────────────────────────
export const fetchDepartments = () => api.get("/departments").then(r => r.data);
export const fetchProgrammes = (departmentId?: string) =>
  api.get("/departments/programmes", { params: departmentId ? { departmentId } : {} }).then(r => r.data);
export const fetchSupervisors = () => api.get("/departments/supervisors").then(r => r.data);
