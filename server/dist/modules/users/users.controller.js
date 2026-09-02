"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersController = exports.UsersController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
const pagination_1 = require("../../utils/pagination");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../../services/audit.service");
class UsersController {
    async listUsers(req, res, next) {
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const { role, status, q } = req.query;
        const where = {};
        if (role)
            where.role = role;
        if (status)
            where.status = status;
        // Simple search by name or email
        if (q) {
            where.OR = [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
            ];
        }
        const total = await database_1.default.user.count({ where });
        const users = await database_1.default.user.findMany({
            where,
            skip,
            take: limit,
            include: {
                studentProfile: true,
                supervisorProfile: true,
            },
            orderBy: { createdAt: "desc" },
        });
        const usersWithoutPassword = users.map(user => {
            const { passwordHash: _, ...rest } = user;
            return rest;
        });
        res.status(200).json({
            data: usersWithoutPassword,
            meta: (0, pagination_1.getPaginationMeta)(total, page, limit),
        });
    }
    async getUser(req, res, next) {
        const { id } = req.params;
        const user = await database_1.default.user.findUnique({
            where: { id },
            include: {
                studentProfile: true,
                supervisorProfile: true,
            },
        });
        if (!user) {
            return next(new ApiError_1.ApiError(404, "User not found"));
        }
        const { passwordHash: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
    }
    async createUser(req, res, next) {
        const { email, password, firstName, lastName, role, phone, avatarUrl, studentNumber, registrationNumber, programme, department, academicYear, staffNumber, title, specialization } = req.body;
        const existingUser = await database_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return next(new ApiError_1.ApiError(400, "User with this email already exists."));
        }
        const passwordHash = await bcrypt_1.default.hash(password || "AcaShield@Default1", 10);
        const result = await database_1.default.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    firstName,
                    lastName,
                    role,
                    phone,
                    avatarUrl,
                },
            });
            if (role === client_1.Role.STUDENT) {
                await tx.studentProfile.create({
                    data: {
                        userId: user.id,
                        studentNumber: studentNumber || `ST-${Date.now().toString().slice(-6)}`,
                        registrationNumber: registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
                        programme: programme || "BSc Computer Science",
                        department: department || "Computer Science",
                        academicYear: academicYear || "2024/2025",
                    },
                });
            }
            else if (role === client_1.Role.SUPERVISOR) {
                await tx.supervisorProfile.create({
                    data: {
                        userId: user.id,
                        staffNumber: staffNumber || `SN-${Date.now().toString().slice(-6)}`,
                        department: department || "Computer Science",
                        title: title || "Dr.",
                        specialization: specialization || "General Academics",
                    },
                });
            }
            return user;
        });
        const { passwordHash: _, ...userWithoutPassword } = result;
        await audit_service_1.auditService.logAction(req.user?.id || null, "USER_CREATE_ADMIN", "USER", result.id, { email: result.email, role: result.role }, req);
        res.status(201).json(userWithoutPassword);
    }
    async updateUser(req, res, next) {
        const { id } = req.params;
        const { firstName, lastName, phone, avatarUrl, status, role, studentNumber, registrationNumber, programme, department, academicYear, staffNumber, title, specialization } = req.body;
        const user = await database_1.default.user.findUnique({
            where: { id },
            include: { studentProfile: true, supervisorProfile: true }
        });
        if (!user) {
            return next(new ApiError_1.ApiError(404, "User not found"));
        }
        const updatedUser = await database_1.default.$transaction(async (tx) => {
            const u = await tx.user.update({
                where: { id },
                data: {
                    firstName,
                    lastName,
                    phone,
                    avatarUrl,
                    status,
                    role,
                },
            });
            if (u.role === client_1.Role.STUDENT) {
                await tx.studentProfile.upsert({
                    where: { userId: id },
                    update: {
                        studentNumber,
                        registrationNumber,
                        programme,
                        department,
                        academicYear,
                    },
                    create: {
                        userId: id,
                        studentNumber: studentNumber || `ST-${Date.now().toString().slice(-6)}`,
                        registrationNumber: registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
                        programme: programme || "BSc Computer Science",
                        department: department || "Computer Science",
                        academicYear: academicYear || "2024/2025",
                    },
                });
            }
            else if (u.role === client_1.Role.SUPERVISOR) {
                await tx.supervisorProfile.upsert({
                    where: { userId: id },
                    update: {
                        staffNumber,
                        department,
                        title,
                        specialization,
                    },
                    create: {
                        userId: id,
                        staffNumber: staffNumber || `SN-${Date.now().toString().slice(-6)}`,
                        department: department || "Computer Science",
                        title: title || "Dr.",
                        specialization: specialization || "General Academics",
                    },
                });
            }
            return tx.user.findUnique({
                where: { id },
                include: {
                    studentProfile: true,
                    supervisorProfile: true,
                },
            });
        });
        if (!updatedUser) {
            return next(new ApiError_1.ApiError(500, "Update failed"));
        }
        const { passwordHash: _, ...userWithoutPassword } = updatedUser;
        await audit_service_1.auditService.logAction(req.user?.id || null, "USER_UPDATE_ADMIN", "USER", id, { changedFields: req.body }, req);
        res.status(200).json(userWithoutPassword);
    }
    async deleteUser(req, res, next) {
        const { id } = req.params;
        const user = await database_1.default.user.findUnique({ where: { id } });
        if (!user) {
            return next(new ApiError_1.ApiError(404, "User not found"));
        }
        // Set status to DELETED instead of hard delete to preserve audits and relations
        await database_1.default.user.update({
            where: { id },
            data: { status: client_1.UserStatus.DELETED },
        });
        await audit_service_1.auditService.logAction(req.user?.id || null, "USER_DELETE_ADMIN", "USER", id, null, req);
        res.status(200).json({ message: "User deleted successfully." });
    }
    async updateUserStatus(req, res, next) {
        const { id } = req.params;
        const { status } = req.body;
        if (!Object.values(client_1.UserStatus).includes(status)) {
            return next(new ApiError_1.ApiError(400, "Invalid user status."));
        }
        const user = await database_1.default.user.findUnique({ where: { id } });
        if (!user) {
            return next(new ApiError_1.ApiError(404, "User not found"));
        }
        const updatedUser = await database_1.default.user.update({
            where: { id },
            data: { status },
        });
        const { passwordHash: _, ...userWithoutPassword } = updatedUser;
        await audit_service_1.auditService.logAction(req.user?.id || null, "USER_STATUS_CHANGE", "USER", id, { status }, req);
        res.status(200).json(userWithoutPassword);
    }
}
exports.UsersController = UsersController;
exports.usersController = new UsersController();
exports.default = exports.usersController;
