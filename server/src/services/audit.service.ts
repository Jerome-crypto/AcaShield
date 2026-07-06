import { Request } from "express";
import prisma from "../config/database";

export class AuditService {
  /**
   * Log an administrative or sensitive action to the audit logs
   */
  async logAction(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata: any = null,
    req?: Request
  ): Promise<void> {
    try {
      const ipAddress = req ? req.ip || req.socket.remoteAddress : null;
      const userAgent = req ? req.headers["user-agent"] : null;

      await prisma.auditLog.create({
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
    } catch (error) {
      // Don't throw to prevent interrupting the main request flow
      console.error("Failed to write audit log:", error);
    }
  }
}

export const auditService = new AuditService();
export default auditService;
