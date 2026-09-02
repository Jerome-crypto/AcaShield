"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const database_1 = __importDefault(require("../config/database"));
class AuditService {
    /**
     * Log an administrative or sensitive action to the audit logs
     */
    async logAction(userId, action, entityType, entityId, metadata = null, req) {
        try {
            const ipAddress = req ? req.ip || req.socket.remoteAddress : null;
            const userAgent = req ? req.headers["user-agent"] : null;
            await database_1.default.auditLog.create({
                data: {
                    userId,
                    action,
                    entityType,
                    entityId,
                    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
                    ipAddress,
                    userAgent,
                },
            });
        }
        catch (error) {
            // Don't throw to prevent interrupting the main request flow
            console.error("Failed to write audit log:", error);
        }
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
exports.default = exports.auditService;
