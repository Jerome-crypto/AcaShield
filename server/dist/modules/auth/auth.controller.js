"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
const generateTokens_1 = require("../../utils/generateTokens");
const audit_service_1 = require("../../services/audit.service");
const email_service_1 = require("../../services/email.service");
const env_1 = require("../../config/env");
const client_1 = require("@prisma/client");
// Global map to store temporary password reset tokens (for simplicity in development)
// In production, this would be in a table or Redis with an expiration time.
const resetTokens = new Map();
class AuthController {
    async register(req, res, next) {
        const { email, password, firstName, lastName, role, phone, avatarUrl, studentNumber, registrationNumber, programme, department, academicYear, staffNumber, title, specialization } = req.body;
        const existingUser = await database_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return next(new ApiError_1.ApiError(400, "User with this email already exists."));
        }
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        // Run in transaction to ensure profile creation is atomic
        const result = await database_1.default.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    firstName,
                    lastName,
                    role,
                    phone,
                    avatarUrl,
                },
            });
            if (role === client_1.Role.STUDENT) {
                if (!studentNumber || !registrationNumber || !programme || !department || !academicYear) {
                    throw new ApiError_1.ApiError(400, "Missing student profile details.");
                }
                await tx.studentProfile.create({
                    data: {
                        userId: user.id,
                        studentNumber,
                        registrationNumber,
                        programme,
                        department,
                        academicYear,
                    },
                });
            }
            else if (role === client_1.Role.SUPERVISOR) {
                if (!staffNumber || !department || !title || !specialization) {
                    throw new ApiError_1.ApiError(400, "Missing supervisor profile details.");
                }
                await tx.supervisorProfile.create({
                    data: {
                        userId: user.id,
                        staffNumber,
                        department,
                        title,
                        specialization,
                    },
                });
            }
            return user;
        });
        const tokens = (0, generateTokens_1.generateTokens)({ id: result.id, role: result.role });
        // Exclude password hash from response
        const { passwordHash: _, ...userWithoutPassword } = result;
        // Log registration
        await audit_service_1.auditService.logAction(result.id, "USER_REGISTER", "USER", result.id, { email: result.email, role: result.role }, req);
        res.status(201).json({
            user: userWithoutPassword,
            ...tokens,
        });
    }
    async login(req, res, next) {
        const { email, password } = req.body;
        const user = await database_1.default.user.findUnique({
            where: { email },
            include: {
                studentProfile: true,
                supervisorProfile: true,
            },
        });
        if (!user) {
            return next(new ApiError_1.ApiError(401, "Invalid email or password."));
        }
        if (user.status === client_1.UserStatus.SUSPENDED) {
            return next(new ApiError_1.ApiError(403, "Your account has been suspended. Please contact the administrator."));
        }
        if (user.status === client_1.UserStatus.DELETED) {
            return next(new ApiError_1.ApiError(401, "Invalid email or password."));
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return next(new ApiError_1.ApiError(401, "Invalid email or password."));
        }
        const tokens = (0, generateTokens_1.generateTokens)({ id: user.id, role: user.role });
        // Exclude password hash
        const { passwordHash: _, ...userWithoutPassword } = user;
        // Log login action
        await audit_service_1.auditService.logAction(user.id, "USER_LOGIN", "USER", user.id, { email: user.email }, req);
        res.status(200).json({
            user: userWithoutPassword,
            ...tokens,
        });
    }
    async refresh(req, res, next) {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return next(new ApiError_1.ApiError(400, "Refresh token is required."));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, env_1.env.jwtRefreshSecret);
            const user = await database_1.default.user.findUnique({
                where: { id: decoded.id },
            });
            if (!user || user.status !== client_1.UserStatus.ACTIVE) {
                return next(new ApiError_1.ApiError(401, "User is no longer active."));
            }
            const tokens = (0, generateTokens_1.generateTokens)({ id: user.id, role: user.role });
            res.status(200).json(tokens);
        }
        catch (error) {
            return next(new ApiError_1.ApiError(401, "Invalid or expired refresh token."));
        }
    }
    async logout(req, res, next) {
        if (req.user) {
            await audit_service_1.auditService.logAction(req.user.id, "USER_LOGOUT", "USER", req.user.id, null, req);
        }
        res.status(200).json({ message: "Logged out successfully." });
    }
    async forgotPassword(req, res, next) {
        const { email } = req.body;
        const user = await database_1.default.user.findUnique({ where: { email } });
        if (!user) {
            // Return 200 even if user doesn't exist for security reasons, so attackers don't verify emails.
            res.status(200).json({ message: "If the email is registered, a password reset link will be sent." });
            return;
        }
        // Generate simple token
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expires = Date.now() + 3600000; // 1 hour
        resetTokens.set(token, { email, expires });
        await email_service_1.emailService.sendPasswordResetEmail(email, token);
        await audit_service_1.auditService.logAction(user.id, "PASSWORD_RESET_REQUEST", "USER", user.id, { email }, req);
        res.status(200).json({ message: "If the email is registered, a password reset link will be sent." });
    }
    async resetPassword(req, res, next) {
        const { token, password } = req.body;
        const record = resetTokens.get(token);
        if (!record || record.expires < Date.now()) {
            return next(new ApiError_1.ApiError(400, "Invalid or expired reset token."));
        }
        const user = await database_1.default.user.findUnique({ where: { email: record.email } });
        if (!user) {
            return next(new ApiError_1.ApiError(404, "User not found."));
        }
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        await database_1.default.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });
        // Delete token
        resetTokens.delete(token);
        await audit_service_1.auditService.logAction(user.id, "PASSWORD_RESET_SUCCESS", "USER", user.id, null, req);
        res.status(200).json({ message: "Password reset successfully. You can now log in." });
    }
    async getMe(req, res, next) {
        if (!req.user) {
            return next(new ApiError_1.ApiError(401, "Authentication required."));
        }
        const user = await database_1.default.user.findUnique({
            where: { id: req.user.id },
            include: {
                studentProfile: true,
                supervisorProfile: true,
            },
        });
        if (!user) {
            return next(new ApiError_1.ApiError(404, "User not found."));
        }
        const { passwordHash: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
exports.default = exports.authController;
