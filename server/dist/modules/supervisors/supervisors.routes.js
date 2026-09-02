"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supervisors_controller_1 = __importDefault(require("./supervisors.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use((0, rbac_middleware_1.authorize)([client_1.Role.SUPERVISOR]));
router.get("/dashboard", supervisors_controller_1.default.getDashboard);
router.get("/review-queue", supervisors_controller_1.default.getReviewQueue);
router.get("/students", supervisors_controller_1.default.getStudents);
router.get("/projects/:id", supervisors_controller_1.default.getProjectDetails);
exports.default = router;
