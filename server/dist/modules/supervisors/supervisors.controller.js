"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supervisorsController = exports.SupervisorsController = void 0;
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
const client_1 = require("@prisma/client");
class SupervisorsController {
    async getDashboard(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const supervisorId = req.user.id;
        // Distinct student count
        const studentCountResult = await database_1.default.project.groupBy({
            by: ["studentId"],
            where: { supervisorId },
        });
        const totalStudents = studentCountResult.length;
        const pendingReviews = await database_1.default.project.count({
            where: {
                supervisorId,
                status: { in: [client_1.ProjectStatus.SUBMITTED, client_1.ProjectStatus.PROCESSING, client_1.ProjectStatus.UNDER_REVIEW] },
            },
        });
        const approvedProjects = await database_1.default.project.count({
            where: { supervisorId, status: client_1.ProjectStatus.APPROVED },
        });
        // Average similarity score of projects
        const avgScoreResult = await database_1.default.project.aggregate({
            where: {
                supervisorId,
                similarityScore: { not: null },
            },
            _avg: {
                similarityScore: true,
            },
        });
        const avgSimilarity = avgScoreResult._avg.similarityScore
            ? Math.round(avgScoreResult._avg.similarityScore)
            : 0;
        const recentSubmissions = await database_1.default.project.findMany({
            where: {
                supervisorId,
                status: { in: [client_1.ProjectStatus.SUBMITTED, client_1.ProjectStatus.UNDER_REVIEW, client_1.ProjectStatus.REVISION_REQUESTED] },
            },
            take: 5,
            orderBy: { updatedAt: "desc" },
            include: {
                student: {
                    select: { firstName: true, lastName: true, email: true },
                },
            },
        });
        res.status(200).json({
            stats: {
                totalStudents,
                pendingReviews,
                approvedProjects,
                avgSimilarity,
            },
            recentSubmissions,
        });
    }
    async getReviewQueue(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const supervisorId = req.user.id;
        const queue = await database_1.default.project.findMany({
            where: {
                supervisorId,
                status: { in: [client_1.ProjectStatus.SUBMITTED, client_1.ProjectStatus.PROCESSING, client_1.ProjectStatus.UNDER_REVIEW] },
            },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        studentProfile: true,
                    },
                },
                department: true,
                programme: true,
                documents: {
                    orderBy: { version: "desc" },
                    take: 1,
                },
            },
            orderBy: { submittedAt: "asc" }, // Oldest first
        });
        res.status(200).json(queue);
    }
    async getStudents(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const supervisorId = req.user.id;
        // Fetch all projects assigned to this supervisor
        const projects = await database_1.default.project.findMany({
            where: { supervisorId },
            include: {
                student: {
                    include: {
                        studentProfile: true,
                    },
                },
            },
        });
        // Map unique students
        const studentMap = new Map();
        for (const p of projects) {
            if (!studentMap.has(p.studentId)) {
                const { passwordHash: _, ...studentWithoutPassword } = p.student;
                studentMap.set(p.studentId, {
                    ...studentWithoutPassword,
                    projectTitle: p.title,
                    projectStatus: p.status,
                    projectSimilarity: p.similarityScore,
                });
            }
        }
        res.status(200).json(Array.from(studentMap.values()));
    }
    async getProjectDetails(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { id } = req.params;
        const supervisorId = req.user.id;
        const project = await database_1.default.project.findFirst({
            where: {
                id,
                // Make sure it belongs to the supervisor
                supervisorId,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        studentProfile: true,
                    },
                },
                department: true,
                programme: true,
                documents: {
                    orderBy: { version: "desc" },
                },
                similarityReports: {
                    orderBy: { generatedAt: "desc" },
                    take: 1,
                    include: {
                        matches: {
                            include: {
                                matchedProject: {
                                    select: { title: true, student: { select: { firstName: true, lastName: true } } },
                                },
                            },
                        },
                    },
                },
                reviews: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!project) {
            return next(new ApiError_1.ApiError(404, "Project not found or not assigned to you."));
        }
        res.status(200).json(project);
    }
}
exports.SupervisorsController = SupervisorsController;
exports.supervisorsController = new SupervisorsController();
exports.default = exports.supervisorsController;
