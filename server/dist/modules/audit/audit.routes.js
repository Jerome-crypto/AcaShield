"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_1 = __importDefault(require("./audit.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use((0, rbac_middleware_1.authorize)([client_1.Role.ADMIN]));
router.get("/", audit_controller_1.default.getLogs);
router.get("/:id", audit_controller_1.default.getLog);
exports.default = router;
