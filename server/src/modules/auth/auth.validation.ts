import { z } from "zod";
import { Role } from "@prisma/client";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    role: z.nativeEnum(Role, { errorMap: () => ({ message: "Role must be STUDENT, SUPERVISOR, or ADMIN" }) }),
    phone: z.string().optional(),
    avatarUrl: z.string().optional(),
    // Student fields
    studentNumber: z.string().optional(),
    registrationNumber: z.string().optional(),
    programme: z.string().optional(),
    department: z.string().optional(),
    academicYear: z.string().optional(),
    // Supervisor fields
    staffNumber: z.string().optional(),
    title: z.string().optional(),
    specialization: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
  }),
});
