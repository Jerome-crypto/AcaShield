import express from "express";
import { corsMiddleware } from "./config/cors";
import { errorHandler } from "./middleware/error.middleware";
import { ApiError } from "./utils/ApiError";

// Route imports
import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import studentsRoutes from "./modules/students/students.routes";
import supervisorsRoutes from "./modules/supervisors/supervisors.routes";
import projectsRoutes from "./modules/projects/projects.routes";
import reviewsRoutes from "./modules/reviews/reviews.routes";
import repositoryRoutes from "./modules/repository/repository.routes";
import plagiarismRoutes from "./modules/plagiarism/plagiarism.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import settingsRoutes from "./modules/settings/settings.routes";
import auditRoutes from "./modules/audit/audit.routes";
import departmentsRoutes from "./modules/departments/departments.routes";

const app = express();

// ─── Core Middleware ─────────────────────────────────────────────────────────
app.use(corsMiddleware());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ─── Request Logging ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const color = res.statusCode >= 400 ? "\x1b[31m" : res.statusCode >= 300 ? "\x1b[33m" : "\x1b[32m";
    console.log(`${color}[${new Date().toISOString()}] ${req.method} ${req.url} → ${res.statusCode} (${duration}ms)\x1b[0m`);
  });
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "AcaShield Backend",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const API = "/api/v1";

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, usersRoutes);
app.use(`${API}/students`, studentsRoutes);
app.use(`${API}/supervisors`, supervisorsRoutes);
app.use(`${API}/projects`, projectsRoutes);
app.use(`${API}/reviews`, reviewsRoutes);
app.use(`${API}/repository`, repositoryRoutes);
app.use(`${API}/plagiarism`, plagiarismRoutes);
app.use(`${API}/notifications`, notificationsRoutes);
app.use(`${API}/reports`, reportsRoutes);
app.use(`${API}/settings`, settingsRoutes);
app.use(`${API}/audit-logs`, auditRoutes);
app.use(`${API}/departments`, departmentsRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
