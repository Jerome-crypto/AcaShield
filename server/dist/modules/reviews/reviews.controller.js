"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewsController = exports.ReviewsController = void 0;
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../../services/audit.service");
class ReviewsController {
    async approveProject(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { projectId } = req.params;
        const { comments } = req.body;
        const supervisorId = req.user.id;
        const project = await database_1.default.project.findFirst({
            where: { id: projectId, supervisorId },
        });
        if (!project)
            return next(new ApiError_1.ApiError(404, "Project not found or not assigned to you."));
        if (project.status !== client_1.ProjectStatus.UNDER_REVIEW && project.status !== client_1.ProjectStatus.SUBMITTED) {
            return next(new ApiError_1.ApiError(400, `Cannot approve a project with status: ${project.status}`));
        }
        await database_1.default.$transaction(async (tx) => {
            await tx.project.update({
                where: { id: projectId },
                data: {
                    status: client_1.ProjectStatus.APPROVED,
                    approvedAt: new Date(),
                },
            });
            await tx.review.create({
                data: {
                    projectId,
                    supervisorId,
                    decision: client_1.ReviewDecision.APPROVED,
                    comments: comments || "",
                },
            });
            // Notify student
            await tx.notification.create({
                data: {
                    userId: project.studentId,
                    title: "🎉 Project Approved!",
                    message: `Your project "${project.title}" has been approved and is now in the repository.`,
                    type: "success",
                },
            });
        });
        await audit_service_1.auditService.logAction(supervisorId, "PROJECT_APPROVE", "PROJECT", projectId, { comments }, req);
        res.status(200).json({ message: "Project approved and added to repository." });
    }
    async requestRevision(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { projectId } = req.params;
        const { comments } = req.body;
        const supervisorId = req.user.id;
        if (!comments || comments.trim() === "") {
            return next(new ApiError_1.ApiError(400, "Revision comments are required."));
        }
        const project = await database_1.default.project.findFirst({
            where: { id: projectId, supervisorId },
        });
        if (!project)
            return next(new ApiError_1.ApiError(404, "Project not found or not assigned to you."));
        await database_1.default.$transaction(async (tx) => {
            await tx.project.update({
                where: { id: projectId },
                data: { status: client_1.ProjectStatus.REVISION_REQUESTED },
            });
            await tx.review.create({
                data: {
                    projectId,
                    supervisorId,
                    decision: client_1.ReviewDecision.REVISION_REQUESTED,
                    comments,
                },
            });
            await tx.notification.create({
                data: {
                    userId: project.studentId,
                    title: "Revision Requested",
                    message: `Your supervisor has requested revisions on "${project.title}". Check the review comments.`,
                    type: "warning",
                },
            });
        });
        await audit_service_1.auditService.logAction(supervisorId, "PROJECT_REVISION_REQUESTED", "PROJECT", projectId, { comments }, req);
        res.status(200).json({ message: "Revision requested. Student has been notified." });
    }
    async rejectProject(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { projectId } = req.params;
        const { comments } = req.body;
        const supervisorId = req.user.id;
        const project = await database_1.default.project.findFirst({
            where: { id: projectId, supervisorId },
        });
        if (!project)
            return next(new ApiError_1.ApiError(404, "Project not found or not assigned to you."));
        await database_1.default.$transaction(async (tx) => {
            await tx.project.update({
                where: { id: projectId },
                data: { status: client_1.ProjectStatus.REJECTED },
            });
            await tx.review.create({
                data: {
                    projectId,
                    supervisorId,
                    decision: client_1.ReviewDecision.REJECTED,
                    comments: comments || "",
                },
            });
            await tx.notification.create({
                data: {
                    userId: project.studentId,
                    title: "Project Rejected",
                    message: `Your project "${project.title}" has been rejected. Please contact your supervisor for more information.`,
                    type: "error",
                },
            });
        });
        await audit_service_1.auditService.logAction(supervisorId, "PROJECT_REJECT", "PROJECT", projectId, { comments }, req);
        res.status(200).json({ message: "Project rejected. Student has been notified." });
    }
    async getReviewHistory(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { projectId } = req.params;
        // Verify access
        const project = await database_1.default.project.findFirst({
            where: {
                id: projectId,
                ...(req.user.role === client_1.Role.STUDENT ? { studentId: req.user.id } : {}),
                ...(req.user.role === client_1.Role.SUPERVISOR ? { supervisorId: req.user.id } : {}),
            },
        });
        if (!project)
            return next(new ApiError_1.ApiError(404, "Project not found."));
        const reviews = await database_1.default.review.findMany({
            where: { projectId },
            orderBy: { createdAt: "desc" },
        });
        const supervisorIds = [...new Set(reviews.map(r => r.supervisorId))];
        const supervisors = await database_1.default.user.findMany({
            where: { id: { in: supervisorIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                supervisorProfile: {
                    select: {
                        title: true,
                        specialization: true,
                    },
                },
            },
        });
        const supMap = new Map(supervisors.map(s => [s.id, s]));
        const enriched = reviews.map(r => ({
            ...r,
            supervisor: supMap.get(r.supervisorId) || null,
        }));
        res.status(200).json(enriched);
    }
    async postComment(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { projectId } = req.params;
        const { comments } = req.body;
        const supervisorId = req.user.id;
        if (!comments || comments.trim() === "") {
            return next(new ApiError_1.ApiError(400, "Comment text is required."));
        }
        const project = await database_1.default.project.findFirst({
            where: { id: projectId, supervisorId },
        });
        if (!project)
            return next(new ApiError_1.ApiError(404, "Project not found or not assigned to you."));
        const note = await database_1.default.review.create({
            data: {
                projectId,
                supervisorId,
                decision: null,
                comments,
                isNote: true,
            },
        });
        await database_1.default.notification.create({
            data: {
                userId: project.studentId,
                title: "New Supervisor Comment",
                message: `Your supervisor has left a note on project "${project.title}".`,
                type: "info",
            },
        });
        await audit_service_1.auditService.logAction(supervisorId, "PROJECT_COMMENT", "PROJECT", projectId, { comments }, req);
        res.status(201).json(note);
    }
}
exports.ReviewsController = ReviewsController;
exports.reviewsController = new ReviewsController();
exports.default = exports.reviewsController;
