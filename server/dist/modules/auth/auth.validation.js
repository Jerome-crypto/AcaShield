"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Invalid email address"),
        password: zod_1.z.string().min(6, "Password must be at least 6 characters long"),
        firstName: zod_1.z.string().min(1, "First name is required"),
        lastName: zod_1.z.string().min(1, "Last name is required"),
        role: zod_1.z.nativeEnum(client_1.Role, { errorMap: () => ({ message: "Role must be STUDENT, SUPERVISOR, or ADMIN" }) }),
        phone: zod_1.z.string().optional(),
        avatarUrl: zod_1.z.string().optional(),
        // Student fields
        studentNumber: zod_1.z.string().optional(),
        registrationNumber: zod_1.z.string().optional(),
        programme: zod_1.z.string().optional(),
        department: zod_1.z.string().optional(),
        academicYear: zod_1.z.string().optional(),
        // Supervisor fields
        staffNumber: zod_1.z.string().optional(),
        title: zod_1.z.string().optional(),
        specialization: zod_1.z.string().optional(),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Invalid email address"),
        password: zod_1.z.string().min(1, "Password is required"),
    }),
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Invalid email address"),
    }),
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1, "Token is required"),
        password: zod_1.z.string().min(6, "Password must be at least 6 characters long"),
    }),
});
