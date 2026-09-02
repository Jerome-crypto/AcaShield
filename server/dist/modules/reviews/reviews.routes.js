"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reviews_controller_1 = __importDefault(require("./reviews.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post("/:projectId/approve", (0, rbac_middleware_1.authorize)([client_1.Role.SUPERVISOR]), reviews_controller_1.default.approveProject);
router.post("/:projectId/request-revision", (0, rbac_middleware_1.authorize)([client_1.Role.SUPERVISOR]), reviews_controller_1.default.requestRevision);
router.post("/:projectId/reject", (0, rbac_middleware_1.authorize)([client_1.Role.SUPERVISOR]), reviews_controller_1.default.rejectProject);
router.post("/:projectId/comment", (0, rbac_middleware_1.authorize)([client_1.Role.SUPERVISOR]), reviews_controller_1.default.postComment);
router.get("/:projectId/history", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT, client_1.Role.SUPERVISOR, client_1.Role.ADMIN]), reviews_controller_1.default.getReviewHistory);
exports.default = router;
