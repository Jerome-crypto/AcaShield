"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_controller_1 = __importDefault(require("./notifications.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get("/", notifications_controller_1.default.getNotifications);
router.patch("/:id/read", notifications_controller_1.default.markAsRead);
router.patch("/read-all", notifications_controller_1.default.markAllAsRead);
router.delete("/:id", notifications_controller_1.default.deleteNotification);
exports.default = router;
