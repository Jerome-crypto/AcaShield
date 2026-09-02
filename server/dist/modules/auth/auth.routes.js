"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("./auth.controller"));
const validation_middleware_1 = require("../../middleware/validation.middleware");
const auth_validation_1 = require("./auth.validation");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post("/register", (0, validation_middleware_1.validate)(auth_validation_1.registerSchema), auth_controller_1.default.register);
router.post("/login", (0, validation_middleware_1.validate)(auth_validation_1.loginSchema), auth_controller_1.default.login);
router.post("/refresh", auth_controller_1.default.refresh);
router.post("/logout", auth_middleware_1.authenticate, auth_controller_1.default.logout);
router.post("/forgot-password", (0, validation_middleware_1.validate)(auth_validation_1.forgotPasswordSchema), auth_controller_1.default.forgotPassword);
router.post("/reset-password", (0, validation_middleware_1.validate)(auth_validation_1.resetPasswordSchema), auth_controller_1.default.resetPassword);
router.get("/me", auth_middleware_1.authenticate, auth_controller_1.default.getMe);
exports.default = router;
