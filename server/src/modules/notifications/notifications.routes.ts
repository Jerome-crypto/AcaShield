import { Router } from "express";
import notificationsController from "./notifications.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", notificationsController.getNotifications);
router.patch("/:id/read", notificationsController.markAsRead);
router.patch("/read-all", notificationsController.markAllAsRead);
router.delete("/:id", notificationsController.deleteNotification);

export default router;
