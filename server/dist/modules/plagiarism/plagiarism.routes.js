"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const plagiarism_controller_1 = __importDefault(require("./plagiarism.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post("/check/:projectId", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT, client_1.Role.SUPERVISOR, client_1.Role.ADMIN]), plagiarism_controller_1.default.runCheck);
router.get("/report/:projectId", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT, client_1.Role.SUPERVISOR, client_1.Role.ADMIN]), plagiarism_controller_1.default.getReport);
router.get("/report/:projectId/download", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT, client_1.Role.SUPERVISOR, client_1.Role.ADMIN]), plagiarism_controller_1.default.downloadReport);
router.get("/matches/:reportId", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT, client_1.Role.SUPERVISOR, client_1.Role.ADMIN]), plagiarism_controller_1.default.getMatches);
exports.default = router;
