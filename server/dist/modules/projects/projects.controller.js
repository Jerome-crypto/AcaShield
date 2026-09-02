"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectsController = exports.ProjectsController = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
const pagination_1 = require("../../utils/pagination");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../../services/audit.service");
const document_parser_service_1 = __importDefault(require("../../services/document-parser.service"));
const similarity_service_1 = __importDefault(require("../../services/similarity.service"));
class ProjectsController {
    async createProject(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { title, abstract, keywords, category, academicYear, departmentId, programmeId, supervisorId } = req.body;
        const project = await database_1.default.project.create({
            data: {
                title,
                abstract,
                keywords,
                category,
                academicYear,
                departmentId,
                programmeId,
                studentId: req.user.id,
                supervisorId,
                status: client_1.ProjectStatus.DRAFT,
            },
        });
        await audit_service_1.auditService.logAction(req.user.id, "PROJECT_CREATE", "PROJECT", project.id, { title }, req);
        res.status(201).json(project);
    }
    async listProjects(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const where = {};
        if (req.user.role === client_1.Role.STUDENT) {
            where.studentId = req.user.id;
        }
        else if (req.user.role === client_1.Role.SUPERVISOR) {
            where.supervisorId = req.user.id;
        }
        // ADMIN can see all
        const { status, q } = req.query;
        if (status)
            where.status = status;
        if (q) {
            where.OR = [
                { title: { contains: q, mode: "insensitive" } },
                { keywords: { contains: q, mode: "insensitive" } },
            ];
        }
        const total = await database_1.default.project.count({ where });
        const projects = await database_1.default.project.findMany({
            where,
            skip,
            take: limit,
            include: {
                student: { select: { firstName: true, lastName: true, email: true } },
                supervisor: { select: { firstName: true, lastName: true, email: true } },
                department: true,
                programme: true,
            },
            orderBy: { updatedAt: "desc" },
        });
        res.status(200).json({ data: projects, meta: (0, pagination_1.getPaginationMeta)(total, page, limit) });
    }
    async getProject(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { id } = req.params;
        const where = { id };
        if (req.user.role === client_1.Role.STUDENT)
            where.studentId = req.user.id;
        else if (req.user.role === client_1.Role.SUPERVISOR)
            where.supervisorId = req.user.id;
        const project = await database_1.default.project.findFirst({
            where,
            include: {
                student: { select: { id: true, firstName: true, lastName: true, email: true, studentProfile: true } },
                supervisor: { select: { id: true, firstName: true, lastName: true, email: true, supervisorProfile: true } },
                department: true,
                programme: true,
                documents: { orderBy: { version: "desc" } },
                reviews: { orderBy: { createdAt: "desc" } },
                similarityReports: {
                    orderBy: { generatedAt: "desc" },
                    take: 1,
                    include: { matches: { take: 10 } },
                },
            },
        });
        if (!project)
            return next(new ApiError_1.ApiError(404, "Project not found"));
        res.status(200).json(project);
    }
    async updateProject(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { id } = req.params;
        const project = await database_1.default.project.findFirst({
            where: { id, studentId: req.user.id },
        });
        if (!project)
            return next(new ApiError_1.ApiError(404, "Project not found"));
        if (project.status === client_1.ProjectStatus.APPROVED || project.status === client_1.ProjectStatus.ARCHIVED) {
            return next(new ApiError_1.ApiError(400, "Cannot edit an approved or archived project."));
        }
        const { title, abstract, keywords, category, academicYear, departmentId, programmeId, supervisorId } = req.body;
        const updated = await database_1.default.project.update({
            where: { id },
            data: { title, abstract, keywords, category, academicYear, departmentId, programmeId, supervisorId },
        });
        await audit_service_1.auditService.logAction(req.user.id, "PROJECT_UPDATE", "PROJECT", id, { title: updated.title }, req);
        res.status(200).json(updated);
    }
    async deleteProject(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { id } = req.params;
        const where = { id };
        if (req.user.role === client_1.Role.STUDENT)
            where.studentId = req.user.id;
        const project = await database_1.default.project.findFirst({ where });
        if (!project)
            return next(new ApiError_1.ApiError(404, "Project not found"));
        if (project.status === client_1.ProjectStatus.APPROVED || project.status === client_1.ProjectStatus.ARCHIVED) {
            return next(new ApiError_1.ApiError(400, "Cannot delete an approved or archived project."));
        }
        await database_1.default.project.delete({ where: { id } });
        await audit_service_1.auditService.logAction(req.user.id, "PROJECT_DELETE", "PROJECT", id, null, req);
        res.status(200).json({ message: "Project deleted" });
    }
    async uploadDocument(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { id } = req.params;
        if (!req.file)
            return next(new ApiError_1.ApiError(400, "No file uploaded"));
        const project = await database_1.default.project.findFirst({
            where: { id, studentId: req.user.id },
        });
        if (!project)
            return next(new ApiError_1.ApiError(404, "Project not found"));
        if (project.status === client_1.ProjectStatus.APPROVED || project.status === client_1.ProjectStatus.ARCHIVED) {
            return next(new ApiError_1.ApiError(400, "Cannot upload to an approved or archived project."));
        }
        // Parse text from document
        let extractedText = "";
        try {
            extractedText = await document_parser_service_1.default.extractText(req.file.buffer, req.file.mimetype);
        }
        catch (err) {
            console.error("Text extraction failed:", err);
        }
        // Calculate SHA-256 checksum of file buffer
        const checksum = crypto_1.default.createHash("sha256").update(req.file.buffer).digest("hex");
        // Determine version number
        const existingDocs = await database_1.default.projectDocument.count({ where: { projectId: id } });
        const version = existingDocs + 1;
        const fileExt = req.file.originalname.split(".").pop()?.toLowerCase() || "pdf";
        const doc = await database_1.default.projectDocument.create({
            data: {
                projectId: id,
                version,
                fileName: req.file.originalname,
                fileType: fileExt,
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                fileData: req.file.buffer,
                extractedText,
                checksum,
            },
        });
        // Update project to latest version
        await database_1.default.project.update({
            where: { id },
            data: { currentVersion: version },
        });
        await audit_service_1.auditService.logAction(req.user.id, "DOCUMENT_UPLOAD", "PROJECT", id, { version, fileName: req.file.originalname }, req);
        // Return doc without binary fileData
        const { fileData: _, ...docWithoutData } = doc;
        res.status(201).json(docWithoutData);
    }
    async submitProject(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { id } = req.params;
        const project = await database_1.default.project.findFirst({
            where: { id, studentId: req.user.id },
            include: { documents: { orderBy: { version: "desc" }, take: 1 } },
        });
        if (!project)
            return next(new ApiError_1.ApiError(404, "Project not found"));
        if (project.documents.length === 0) {
            return next(new ApiError_1.ApiError(400, "Please upload a document before submitting."));
        }
        if (project.status !== client_1.ProjectStatus.DRAFT && project.status !== client_1.ProjectStatus.REVISION_REQUESTED) {
            return next(new ApiError_1.ApiError(400, `Cannot submit a project with status: ${project.status}`));
        }
        const latestDoc = project.documents[0];
        const updated = await database_1.default.project.update({
            where: { id },
            data: {
                status: client_1.ProjectStatus.PROCESSING,
                submittedAt: new Date(),
            },
        });
        // Trigger similarity check async (non-blocking)
        setImmediate(async () => {
            try {
                await similarity_service_1.default.checkProjectSimilarity(id, latestDoc.id);
                // Move to UNDER_REVIEW after similarity check completes
                await database_1.default.project.update({
                    where: { id },
                    data: { status: client_1.ProjectStatus.UNDER_REVIEW },
                });
                // Notify supervisor
                await database_1.default.notification.create({
                    data: {
                        userId: project.supervisorId,
                        title: "New Project Submitted for Review",
                        message: `A student has submitted project "${project.title}" for your review.`,
                        type: "info",
                    },
                });
                // Notify student
                await database_1.default.notification.create({
                    data: {
                        userId: project.studentId,
                        title: "Similarity Report Ready",
                        message: `Originality analysis for "${project.title}" is complete. Check your reports.`,
                        type: "info",
                    },
                });
            }
            catch (err) {
                console.error("Error in post-submission similarity check:", err);
                await database_1.default.project.update({
                    where: { id },
                    data: { status: client_1.ProjectStatus.SUBMITTED },
                });
            }
        });
        await audit_service_1.auditService.logAction(req.user.id, "PROJECT_SUBMIT", "PROJECT", id, { title: project.title }, req);
        res.status(200).json({ message: "Project submitted successfully. Similarity analysis in progress.", project: updated });
    }
    async resubmitProject(req, res, next) {
        // Same logic as submit — student can resubmit after revision requested
        return this.submitProject(req, res, next);
    }
    async getDocument(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { id } = req.params;
        const { versionId, download } = req.query;
        const project = await database_1.default.project.findFirst({ where: { id } });
        if (!project)
            return next(new ApiError_1.ApiError(404, "Project not found"));
        const whereDoc = { projectId: id };
        if (versionId)
            whereDoc.id = versionId;
        const doc = await database_1.default.projectDocument.findFirst({
            where: whereDoc,
            orderBy: { version: "desc" },
        });
        if (!doc)
            return next(new ApiError_1.ApiError(404, "No document found for this project"));
        const isDownload = download === "true" || download === "1";
        res.setHeader("Content-Type", doc.mimeType || "application/pdf");
        res.setHeader("Content-Disposition", `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(doc.fileName)}"`);
        res.send(doc.fileData);
    }
    async getVersions(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { id } = req.params;
        const docs = await database_1.default.projectDocument.findMany({
            where: { projectId: id },
            orderBy: { version: "desc" },
            select: {
                id: true,
                version: true,
                fileName: true,
                fileType: true,
                fileSize: true,
                checksum: true,
                uploadedAt: true,
                mimeType: true,
            },
        });
        res.status(200).json(docs);
    }
    async assignSupervisor(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { id } = req.params;
        const { supervisorId } = req.body;
        if (!supervisorId) {
            return next(new ApiError_1.ApiError(400, "supervisorId is required."));
        }
        const project = await database_1.default.project.findUnique({
            where: { id },
        });
        if (!project) {
            return next(new ApiError_1.ApiError(404, "Project not found."));
        }
        const supervisor = await database_1.default.user.findFirst({
            where: { id: supervisorId, role: client_1.Role.SUPERVISOR },
        });
        if (!supervisor) {
            return next(new ApiError_1.ApiError(400, "Invalid supervisor ID or user is not a supervisor."));
        }
        const updated = await database_1.default.project.update({
            where: { id },
            data: { supervisorId },
            include: {
                supervisor: { select: { firstName: true, lastName: true } },
            },
        });
        await database_1.default.notification.create({
            data: {
                userId: project.studentId,
                title: "Supervisor Reassigned",
                message: `Your project "${project.title}" has been assigned to supervisor ${updated.supervisor.firstName} ${updated.supervisor.lastName}.`,
                type: "info",
            },
        });
        await database_1.default.notification.create({
            data: {
                userId: supervisorId,
                title: "New Project Assigned",
                message: `You have been assigned as the supervisor for project "${project.title}".`,
                type: "info",
            },
        });
        await audit_service_1.auditService.logAction(req.user.id, "PROJECT_ASSIGN_SUPERVISOR", "PROJECT", id, { supervisorId }, req);
        res.status(200).json(updated);
    }
}
exports.ProjectsController = ProjectsController;
exports.projectsController = new ProjectsController();
exports.default = exports.projectsController;
