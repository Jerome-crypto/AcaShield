"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsController = exports.NotificationsController = void 0;
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
class NotificationsController {
    async getNotifications(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const notifications = await database_1.default.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        const unreadCount = await database_1.default.notification.count({
            where: { userId: req.user.id, isRead: false },
        });
        res.status(200).json({ data: notifications, unreadCount });
    }
    async markAsRead(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { id } = req.params;
        const notification = await database_1.default.notification.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!notification)
            return next(new ApiError_1.ApiError(404, "Notification not found."));
        const updated = await database_1.default.notification.update({
            where: { id },
            data: { isRead: true },
        });
        res.status(200).json(updated);
    }
    async markAllAsRead(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        await database_1.default.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true },
        });
        res.status(200).json({ message: "All notifications marked as read." });
    }
    async deleteNotification(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const { id } = req.params;
        const notification = await database_1.default.notification.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!notification)
            return next(new ApiError_1.ApiError(404, "Notification not found."));
        await database_1.default.notification.delete({ where: { id } });
        res.status(200).json({ message: "Notification deleted." });
    }
}
exports.NotificationsController = NotificationsController;
exports.notificationsController = new NotificationsController();
exports.default = exports.notificationsController;
