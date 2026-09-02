"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = require("./config/cors");
const error_middleware_1 = require("./middleware/error.middleware");
const ApiError_1 = require("./utils/ApiError");
// Route imports
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const students_routes_1 = __importDefault(require("./modules/students/students.routes"));
const supervisors_routes_1 = __importDefault(require("./modules/supervisors/supervisors.routes"));
const projects_routes_1 = __importDefault(require("./modules/projects/projects.routes"));
const reviews_routes_1 = __importDefault(require("./modules/reviews/reviews.routes"));
const repository_routes_1 = __importDefault(require("./modules/repository/repository.routes"));
const plagiarism_routes_1 = __importDefault(require("./modules/plagiarism/plagiarism.routes"));
const notifications_routes_1 = __importDefault(require("./modules/notifications/notifications.routes"));
const reports_routes_1 = __importDefault(require("./modules/reports/reports.routes"));
const settings_routes_1 = __importDefault(require("./modules/settings/settings.routes"));
const audit_routes_1 = __importDefault(require("./modules/audit/audit.routes"));
const departments_routes_1 = __importDefault(require("./modules/departments/departments.routes"));
const app = (0, express_1.default)();
// ─── Core Middleware ─────────────────────────────────────────────────────────
app.use((0, cors_1.corsMiddleware)());
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
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
app.use(`${API}/auth`, auth_routes_1.default);
app.use(`${API}/users`, users_routes_1.default);
app.use(`${API}/students`, students_routes_1.default);
app.use(`${API}/supervisors`, supervisors_routes_1.default);
app.use(`${API}/projects`, projects_routes_1.default);
app.use(`${API}/reviews`, reviews_routes_1.default);
app.use(`${API}/repository`, repository_routes_1.default);
app.use(`${API}/plagiarism`, plagiarism_routes_1.default);
app.use(`${API}/notifications`, notifications_routes_1.default);
app.use(`${API}/reports`, reports_routes_1.default);
app.use(`${API}/settings`, settings_routes_1.default);
app.use(`${API}/audit-logs`, audit_routes_1.default);
app.use(`${API}/departments`, departments_routes_1.default);
// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    next(new ApiError_1.ApiError(404, `Route ${req.originalUrl} not found`));
});
// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(error_middleware_1.errorHandler);
exports.default = app;
