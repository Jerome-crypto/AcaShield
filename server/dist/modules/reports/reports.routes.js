"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reports_controller_1 = __importDefault(require("./reports.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use((0, rbac_middleware_1.authorize)([client_1.Role.ADMIN, client_1.Role.SUPERVISOR]));
router.get("/dashboard", reports_controller_1.default.getDashboard);
router.get("/submission-trends", reports_controller_1.default.getSubmissionTrends);
router.get("/similarity-trends", reports_controller_1.default.getSimilarityTrends);
router.get("/repository-growth", reports_controller_1.default.getRepositoryGrowth);
router.get("/department-performance", reports_controller_1.default.getDepartmentPerformance);
exports.default = router;
