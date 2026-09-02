"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const repository_controller_1 = __importDefault(require("./repository.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Repository is accessible to all authenticated users
router.use(auth_middleware_1.authenticate);
router.get("/search", repository_controller_1.default.searchProjects);
router.get("/projects", repository_controller_1.default.listRepositoryProjects);
router.get("/projects/:id", repository_controller_1.default.getRepositoryProject);
router.get("/projects/:id/download", repository_controller_1.default.downloadDocument);
router.get("/filters", repository_controller_1.default.getFilters);
exports.default = router;
