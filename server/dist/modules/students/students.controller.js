"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentsController = exports.StudentsController = void 0;
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
const client_1 = require("@prisma/client");
class StudentsController {
    async getDashboard(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const studentId = req.user.id;
        const totalProjects = await database_1.default.project.count({ where: { studentId } });
        const pendingReviews = await database_1.default.project.count({
            where: {
                studentId,
                status: { in: [client_1.ProjectStatus.SUBMITTED, client_1.ProjectStatus.PROCESSING, client_1.ProjectStatus.UNDER_REVIEW] },
            },
        });
        const approvedProjects = await database_1.default.project.count({
            where: { studentId, status: client_1.ProjectStatus.APPROVED },
        });
        const revisionRequested = await database_1.default.project.count({
            where: { studentId, status: client_1.ProjectStatus.REVISION_REQUESTED },
        });
        // Average similarity score
        const avgScoreResult = await database_1.default.project.aggregate({
            where: {
                studentId,
                similarityScore: { not: null },
            },
            _avg: {
                similarityScore: true,
            },
        });
        const avgSimilarity = avgScoreResult._avg.similarityScore
            ? Math.round(avgScoreResult._avg.similarityScore)
            : 0;
        const recentProjects = await database_1.default.project.findMany({
            where: { studentId },
            take: 5,
            orderBy: { updatedAt: "desc" },
            include: {
                supervisor: {
                    select: { firstName: true, lastName: true },
                },
            },
        });
        res.status(200).json({
            stats: {
                totalProjects,
                pendingReviews,
                approvedProjects,
                revisionRequested,
                avgSimilarity,
            },
            recentProjects,
        });
    }
    async getProjects(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const studentId = req.user.id;
        const projects = await database_1.default.project.findMany({
            where: { studentId },
            include: {
                supervisor: {
                    select: { firstName: true, lastName: true, email: true },
                },
                department: true,
                programme: true,
            },
            orderBy: { updatedAt: "desc" },
        });
        res.status(200).json(projects);
    }
    async getReports(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const studentId = req.user.id;
        const reports = await database_1.default.similarityReport.findMany({
            where: {
                project: { studentId },
            },
            include: {
                project: {
                    select: { title: true, status: true },
                },
                document: {
                    select: { fileName: true, version: true },
                },
            },
            orderBy: { generatedAt: "desc" },
        });
        res.status(200).json(reports);
    }
    async getActivity(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const userId = req.user.id;
        const activities = await database_1.default.auditLog.findMany({
            where: { userId },
            take: 20,
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(activities);
    }
}
exports.StudentsController = StudentsController;
exports.studentsController = new StudentsController();
exports.default = exports.studentsController;
