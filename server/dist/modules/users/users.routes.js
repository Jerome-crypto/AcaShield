"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = __importDefault(require("./users.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Guard all routes with Admin-only access
router.use(auth_middleware_1.authenticate);
router.use((0, rbac_middleware_1.authorize)([client_1.Role.ADMIN]));
router.get("/", users_controller_1.default.listUsers);
router.get("/:id", users_controller_1.default.getUser);
router.post("/", users_controller_1.default.createUser);
router.patch("/:id", users_controller_1.default.updateUser);
router.delete("/:id", users_controller_1.default.deleteUser);
router.patch("/:id/status", users_controller_1.default.updateUserStatus);
exports.default = router;
