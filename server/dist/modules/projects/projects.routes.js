"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projects_controller_1 = __importDefault(require("./projects.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const upload_middleware_1 = require("../../middleware/upload.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Create, list, get, update, delete
router.post("/", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT]), projects_controller_1.default.createProject);
router.get("/", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT, client_1.Role.SUPERVISOR, client_1.Role.ADMIN]), projects_controller_1.default.listProjects);
router.get("/:id", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT, client_1.Role.SUPERVISOR, client_1.Role.ADMIN]), projects_controller_1.default.getProject);
router.patch("/:id", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT]), projects_controller_1.default.updateProject);
router.delete("/:id", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT, client_1.Role.ADMIN]), projects_controller_1.default.deleteProject);
router.patch("/:id/assign-supervisor", (0, rbac_middleware_1.authorize)([client_1.Role.ADMIN]), projects_controller_1.default.assignSupervisor);
// Document handling
router.post("/:id/upload", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT]), upload_middleware_1.upload.single("document"), projects_controller_1.default.uploadDocument);
router.post("/:id/submit", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT]), projects_controller_1.default.submitProject);
router.post("/:id/resubmit", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT]), projects_controller_1.default.resubmitProject);
router.get("/:id/document", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT, client_1.Role.SUPERVISOR, client_1.Role.ADMIN]), projects_controller_1.default.getDocument);
router.get("/:id/versions", (0, rbac_middleware_1.authorize)([client_1.Role.STUDENT, client_1.Role.SUPERVISOR, client_1.Role.ADMIN]), projects_controller_1.default.getVersions);
exports.default = router;
