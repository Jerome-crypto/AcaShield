"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.departmentsController = exports.DepartmentsController = void 0;
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
const audit_service_1 = require("../../services/audit.service");
const client_1 = require("@prisma/client");
class DepartmentsController {
    async listDepartments(req, res, next) {
        const departments = await database_1.default.department.findMany({
            include: {
                programmes: true,
                _count: { select: { projects: true } },
            },
            orderBy: { name: "asc" },
        });
        res.status(200).json(departments);
    }
    async createDepartment(req, res, next) {
        const { name, code, description } = req.body;
        if (!name || !code) {
            return next(new ApiError_1.ApiError(400, "Department name and code are required."));
        }
        const existingName = await database_1.default.department.findFirst({
            where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { code: { equals: code, mode: "insensitive" } }] },
        });
        if (existingName) {
            return next(new ApiError_1.ApiError(400, "A department with this name or code already exists."));
        }
        const department = await database_1.default.department.create({
            data: {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                description: description?.trim() || null,
            },
            include: { programmes: true },
        });
        await audit_service_1.auditService.logAction(req.user?.id || null, "DEPARTMENT_CREATE", "DEPARTMENT", department.id, { name: department.name, code: department.code }, req);
        res.status(201).json(department);
    }
    async updateDepartment(req, res, next) {
        const { id } = req.params;
        const { name, code, description } = req.body;
        const existing = await database_1.default.department.findUnique({ where: { id } });
        if (!existing) {
            return next(new ApiError_1.ApiError(404, "Department not found."));
        }
        if (name || code) {
            const conflict = await database_1.default.department.findFirst({
                where: {
                    id: { not: id },
                    OR: [
                        ...(name ? [{ name: { equals: name, mode: "insensitive" } }] : []),
                        ...(code ? [{ code: { equals: code, mode: "insensitive" } }] : []),
                    ],
                },
            });
            if (conflict) {
                return next(new ApiError_1.ApiError(400, "Another department already uses this name or code."));
            }
        }
        const updated = await database_1.default.department.update({
            where: { id },
            data: {
                ...(name ? { name: name.trim() } : {}),
                ...(code ? { code: code.trim().toUpperCase() } : {}),
                ...(description !== undefined ? { description: description?.trim() || null } : {}),
            },
            include: { programmes: true },
        });
        await audit_service_1.auditService.logAction(req.user?.id || null, "DEPARTMENT_UPDATE", "DEPARTMENT", id, { changed: req.body }, req);
        res.status(200).json(updated);
    }
    async deleteDepartment(req, res, next) {
        const { id } = req.params;
        const department = await database_1.default.department.findUnique({
            where: { id },
            include: { _count: { select: { projects: true, programmes: true } } },
        });
        if (!department) {
            return next(new ApiError_1.ApiError(404, "Department not found."));
        }
        if (department._count.projects > 0) {
            return next(new ApiError_1.ApiError(400, `Cannot delete department "${department.name}" because it contains ${department._count.projects} projects.`));
        }
        await database_1.default.department.delete({ where: { id } });
        await audit_service_1.auditService.logAction(req.user?.id || null, "DEPARTMENT_DELETE", "DEPARTMENT", id, { name: department.name }, req);
        res.status(200).json({ message: "Department deleted successfully." });
    }
    async listProgrammes(req, res, next) {
        const { departmentId } = req.query;
        const where = {};
        if (departmentId)
            where.departmentId = departmentId;
        const programmes = await database_1.default.programme.findMany({
            where,
            include: {
                department: true,
                _count: { select: { projects: true } },
            },
            orderBy: { name: "asc" },
        });
        res.status(200).json(programmes);
    }
    async createProgramme(req, res, next) {
        const { name, code, departmentId } = req.body;
        if (!name || !code || !departmentId) {
            return next(new ApiError_1.ApiError(400, "Programme name, code, and departmentId are required."));
        }
        const dept = await database_1.default.department.findUnique({ where: { id: departmentId } });
        if (!dept) {
            return next(new ApiError_1.ApiError(404, "Target department not found."));
        }
        const existing = await database_1.default.programme.findFirst({
            where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { code: { equals: code, mode: "insensitive" } }] },
        });
        if (existing) {
            return next(new ApiError_1.ApiError(400, "A programme with this name or code already exists."));
        }
        const programme = await database_1.default.programme.create({
            data: {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                departmentId,
            },
            include: { department: true },
        });
        await audit_service_1.auditService.logAction(req.user?.id || null, "PROGRAMME_CREATE", "PROGRAMME", programme.id, { name: programme.name, department: dept.name }, req);
        res.status(201).json(programme);
    }
    async updateProgramme(req, res, next) {
        const { id } = req.params;
        const { name, code, departmentId } = req.body;
        const existing = await database_1.default.programme.findUnique({ where: { id } });
        if (!existing) {
            return next(new ApiError_1.ApiError(404, "Programme not found."));
        }
        if (departmentId) {
            const dept = await database_1.default.department.findUnique({ where: { id: departmentId } });
            if (!dept)
                return next(new ApiError_1.ApiError(404, "Department not found."));
        }
        if (name || code) {
            const conflict = await database_1.default.programme.findFirst({
                where: {
                    id: { not: id },
                    OR: [
                        ...(name ? [{ name: { equals: name, mode: "insensitive" } }] : []),
                        ...(code ? [{ code: { equals: code, mode: "insensitive" } }] : []),
                    ],
                },
            });
            if (conflict) {
                return next(new ApiError_1.ApiError(400, "Another programme already uses this name or code."));
            }
        }
        const updated = await database_1.default.programme.update({
            where: { id },
            data: {
                ...(name ? { name: name.trim() } : {}),
                ...(code ? { code: code.trim().toUpperCase() } : {}),
                ...(departmentId ? { departmentId } : {}),
            },
            include: { department: true },
        });
        await audit_service_1.auditService.logAction(req.user?.id || null, "PROGRAMME_UPDATE", "PROGRAMME", id, { changed: req.body }, req);
        res.status(200).json(updated);
    }
    async deleteProgramme(req, res, next) {
        const { id } = req.params;
        const programme = await database_1.default.programme.findUnique({
            where: { id },
            include: { _count: { select: { projects: true } } },
        });
        if (!programme) {
            return next(new ApiError_1.ApiError(404, "Programme not found."));
        }
        if (programme._count.projects > 0) {
            return next(new ApiError_1.ApiError(400, `Cannot delete programme "${programme.name}" because it is linked to ${programme._count.projects} projects.`));
        }
        await database_1.default.programme.delete({ where: { id } });
        await audit_service_1.auditService.logAction(req.user?.id || null, "PROGRAMME_DELETE", "PROGRAMME", id, { name: programme.name }, req);
        res.status(200).json({ message: "Programme deleted successfully." });
    }
    async listSupervisors(req, res, next) {
        const supervisors = await database_1.default.user.findMany({
            where: { role: client_1.Role.SUPERVISOR, status: "ACTIVE" },
            include: { supervisorProfile: true },
            orderBy: { lastName: "asc" },
        });
        const safe = supervisors.map(({ passwordHash: _, ...s }) => s);
        res.status(200).json(safe);
    }
}
exports.DepartmentsController = DepartmentsController;
exports.departmentsController = new DepartmentsController();
exports.default = exports.departmentsController;
