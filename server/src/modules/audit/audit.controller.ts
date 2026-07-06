import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { getPaginationParams, getPaginationMeta } from "../../utils/pagination";

export class AuditController {
  async getLogs(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));

    const { page, limit, skip } = getPaginationParams(req.query);
    const { userId, action, entityType, q } = req.query;

    const where: any = {};
    if (userId) where.userId = userId as string;
    if (action) where.action = { contains: action as string, mode: "insensitive" };
    if (entityType) where.entityType = entityType as string;
    if (q) {
      where.OR = [
        { action: { contains: q as string, mode: "insensitive" } },
        { entityType: { contains: q as string, mode: "insensitive" } },
      ];
    }

    const total = await prisma.auditLog.count({ where });
    const logs = await prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, role: true } },
      },
    });

    res.status(200).json({ data: logs, meta: getPaginationMeta(total, page, limit) });
  }

  async getLog(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, role: true } },
      },
    });

    if (!log) return next(new ApiError(404, "Audit log not found."));
    res.status(200).json(log);
  }
}

export const auditController = new AuditController();
export default auditController;
