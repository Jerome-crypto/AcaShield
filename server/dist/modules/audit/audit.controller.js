"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditController = exports.AuditController = void 0;
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
const pagination_1 = require("../../utils/pagination");
class AuditController {
    async getLogs(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const { userId, action, entityType, q } = req.query;
        const where = {};
        if (userId)
            where.userId = userId;
        if (action)
            where.action = { contains: action, mode: "insensitive" };
        if (entityType)
            where.entityType = entityType;
        if (q) {
            where.OR = [
                { action: { contains: q, mode: "insensitive" } },
                { entityType: { contains: q, mode: "insensitive" } },
            ];
        }
        const total = await database_1.default.auditLog.count({ where });
        const logs = await database_1.default.auditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { firstName: true, lastName: true, email: true, role: true } },
            },
        });
        res.status(200).json({ data: logs, meta: (0, pagination_1.getPaginationMeta)(total, page, limit) });
    }
    async getLog(req, res, next) {
        const { id } = req.params;
        const log = await database_1.default.auditLog.findUnique({
            where: { id },
            include: {
                user: { select: { firstName: true, lastName: true, email: true, role: true } },
            },
        });
        if (!log)
            return next(new ApiError_1.ApiError(404, "Audit log not found."));
        res.status(200).json(log);
    }
}
exports.AuditController = AuditController;
exports.auditController = new AuditController();
exports.default = exports.auditController;
