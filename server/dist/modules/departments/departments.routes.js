"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const departments_controller_1 = __importDefault(require("./departments.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Public read for all authenticated users
router.get("/", departments_controller_1.default.listDepartments);
router.get("/programmes", departments_controller_1.default.listProgrammes);
router.get("/supervisors", departments_controller_1.default.listSupervisors);
// Admin-only management endpoints
router.post("/", (0, rbac_middleware_1.authorize)([client_1.Role.ADMIN]), departments_controller_1.default.createDepartment);
router.patch("/:id", (0, rbac_middleware_1.authorize)([client_1.Role.ADMIN]), departments_controller_1.default.updateDepartment);
router.delete("/:id", (0, rbac_middleware_1.authorize)([client_1.Role.ADMIN]), departments_controller_1.default.deleteDepartment);
router.post("/programmes", (0, rbac_middleware_1.authorize)([client_1.Role.ADMIN]), departments_controller_1.default.createProgramme);
router.patch("/programmes/:id", (0, rbac_middleware_1.authorize)([client_1.Role.ADMIN]), departments_controller_1.default.updateProgramme);
router.delete("/programmes/:id", (0, rbac_middleware_1.authorize)([client_1.Role.ADMIN]), departments_controller_1.default.deleteProgramme);
exports.default = router;
