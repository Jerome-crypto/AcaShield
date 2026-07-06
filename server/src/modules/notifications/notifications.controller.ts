import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { ApiError } from "../../utils/ApiError";

export class NotificationsController {
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    res.status(200).json({ data: notifications, unreadCount });
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) return next(new ApiError(404, "Notification not found."));

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.status(200).json(updated);
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));

    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    res.status(200).json({ message: "All notifications marked as read." });
  }

  async deleteNotification(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) return next(new ApiError(404, "Notification not found."));

    await prisma.notification.delete({ where: { id } });
    res.status(200).json({ message: "Notification deleted." });
  }
}

export const notificationsController = new NotificationsController();
export default notificationsController;
