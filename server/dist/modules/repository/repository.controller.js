"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.repositoryController = exports.RepositoryController = void 0;
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
const pagination_1 = require("../../utils/pagination");
const client_1 = require("@prisma/client");
class RepositoryController {
    async searchProjects(req, res, next) {
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const { q, department, programme, supervisor, year, category } = req.query;
        const where = {
            status: { in: [client_1.ProjectStatus.APPROVED, client_1.ProjectStatus.ARCHIVED] },
        };
        if (q) {
            where.OR = [
                { title: { contains: q, mode: "insensitive" } },
                { abstract: { contains: q, mode: "insensitive" } },
                { keywords: { contains: q, mode: "insensitive" } },
            ];
        }
        if (department) {
            where.department = { name: { contains: department, mode: "insensitive" } };
        }
        if (programme) {
            where.programme = { name: { contains: programme, mode: "insensitive" } };
        }
        if (supervisor) {
            where.supervisor = {
                OR: [
                    { firstName: { contains: supervisor, mode: "insensitive" } },
                    { lastName: { contains: supervisor, mode: "insensitive" } },
                ],
            };
        }
        if (year)
            where.academicYear = year;
        if (category)
            where.category = { contains: category, mode: "insensitive" };
        const total = await database_1.default.project.count({ where });
        const projects = await database_1.default.project.findMany({
            where,
            skip,
            take: limit,
            select: {
                id: true,
                title: true,
                abstract: true,
                keywords: true,
                category: true,
                academicYear: true,
                status: true,
                similarityScore: true,
                riskLevel: true,
                approvedAt: true,
                student: { select: { firstName: true, lastName: true } },
                supervisor: { select: { firstName: true, lastName: true, supervisorProfile: { select: { title: true } } } },
                department: { select: { name: true, code: true } },
                programme: { select: { name: true, code: true } },
            },
            orderBy: { approvedAt: "desc" },
        });
        res.status(200).json({ data: projects, meta: (0, pagination_1.getPaginationMeta)(total, page, limit) });
    }
    async listRepositoryProjects(req, res, next) {
        return this.searchProjects(req, res, next);
    }
    async getRepositoryProject(req, res, next) {
        const { id } = req.params;
        const project = await database_1.default.project.findFirst({
            where: {
                id,
                status: { in: [client_1.ProjectStatus.APPROVED, client_1.ProjectStatus.ARCHIVED] },
            },
            include: {
                student: { select: { firstName: true, lastName: true } },
                supervisor: {
                    select: {
                        firstName: true,
                        lastName: true,
                        supervisorProfile: { select: { title: true, department: true } },
                    },
                },
                department: true,
                programme: true,
                documents: {
                    orderBy: { version: "desc" },
                    take: 1,
                    select: { id: true, version: true, fileName: true, fileSize: true, mimeType: true, uploadedAt: true },
                },
                similarityReports: {
                    orderBy: { generatedAt: "desc" },
                    take: 1,
                    select: { overallScore: true, riskLevel: true, summary: true },
                },
            },
        });
        if (!project)
            return next(new ApiError_1.ApiError(404, "Project not found in repository."));
        res.status(200).json(project);
    }
    async downloadDocument(req, res, next) {
        const { id } = req.params;
        const { preview } = req.query;
        const project = await database_1.default.project.findFirst({
            where: {
                id,
                status: { in: [client_1.ProjectStatus.APPROVED, client_1.ProjectStatus.ARCHIVED] },
            },
            include: {
                documents: { orderBy: { version: "desc" }, take: 1 },
            },
        });
        if (!project || project.documents.length === 0) {
            return next(new ApiError_1.ApiError(404, "Document not found."));
        }
        const doc = project.documents[0];
        const isPreview = preview === "true" || preview === "1";
        res.setHeader("Content-Type", doc.mimeType || "application/pdf");
        res.setHeader("Content-Disposition", `${isPreview ? "inline" : "attachment"}; filename="${encodeURIComponent(doc.fileName)}"`);
        res.send(doc.fileData);
    }
    async getFilters(req, res, next) {
        const [departments, programmes, years, categories] = await Promise.all([
            database_1.default.department.findMany({ select: { id: true, name: true, code: true } }),
            database_1.default.programme.findMany({ select: { id: true, name: true, code: true, departmentId: true } }),
            database_1.default.project.findMany({
                where: { status: { in: [client_1.ProjectStatus.APPROVED, client_1.ProjectStatus.ARCHIVED] } },
                distinct: ["academicYear"],
                select: { academicYear: true },
                orderBy: { academicYear: "desc" },
            }),
            database_1.default.project.findMany({
                where: { status: { in: [client_1.ProjectStatus.APPROVED, client_1.ProjectStatus.ARCHIVED] } },
                distinct: ["category"],
                select: { category: true },
                orderBy: { category: "asc" },
            }),
        ]);
        res.status(200).json({
            departments,
            programmes,
            years: years.map(y => y.academicYear),
            categories: categories.map(c => c.category),
        });
    }
}
exports.RepositoryController = RepositoryController;
exports.repositoryController = new RepositoryController();
exports.default = exports.repositoryController;
