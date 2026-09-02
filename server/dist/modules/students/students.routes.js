"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const students_controller_1 = __importDefault(require("./students.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use((0, rbac_middleware_1.authorize)([client_1.Role.STUDENT]));
router.get("/dashboard", students_controller_1.default.getDashboard);
router.get("/projects", students_controller_1.default.getProjects);
router.get("/reports", students_controller_1.default.getReports);
router.get("/activity", students_controller_1.default.getActivity);
exports.default = router;
