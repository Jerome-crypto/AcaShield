import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { generateTokens } from "../../utils/generateTokens";
import { auditService } from "../../services/audit.service";
import { emailService } from "../../services/email.service";
import { env } from "../../config/env";
import { Role, UserStatus } from "@prisma/client";

// Global map to store temporary password reset tokens (for simplicity in development)
// In production, this would be in a table or Redis with an expiration time.
const resetTokens = new Map<string, { email: string; expires: number }>();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    const {
      email, password, firstName, lastName, role, phone, avatarUrl,
      studentNumber, registrationNumber, programme, department, academicYear,
      staffNumber, title, specialization
    } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new ApiError(400, "User with this email already exists."));
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Run in transaction to ensure profile creation is atomic
    const result = await prisma.$transaction(async (tx) => {
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

      if (role === Role.STUDENT) {
        if (!studentNumber || !registrationNumber || !programme || !department || !academicYear) {
          throw new ApiError(400, "Missing student profile details.");
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
      } else if (role === Role.SUPERVISOR) {
        if (!staffNumber || !department || !title || !specialization) {
          throw new ApiError(400, "Missing supervisor profile details.");
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

    const tokens = generateTokens({ id: result.id, role: result.role });

    // Exclude password hash from response
    const { passwordHash: _, ...userWithoutPassword } = result;

    // Log registration
    await auditService.logAction(result.id, "USER_REGISTER", "USER", result.id, { email: result.email, role: result.role }, req);

    res.status(201).json({
      user: userWithoutPassword,
      ...tokens,
    });
  }

  async login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        supervisorProfile: true,
      },
    });

    if (!user) {
      return next(new ApiError(401, "Invalid email or password."));
    }

    if (user.status === UserStatus.SUSPENDED) {
      return next(new ApiError(403, "Your account has been suspended. Please contact the administrator."));
    }

    if (user.status === UserStatus.DELETED) {
      return next(new ApiError(401, "Invalid email or password."));
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return next(new ApiError(401, "Invalid email or password."));
    }

    const tokens = generateTokens({ id: user.id, role: user.role });

    // Exclude password hash
    const { passwordHash: _, ...userWithoutPassword } = user;

    // Log login action
    await auditService.logAction(user.id, "USER_LOGIN", "USER", user.id, { email: user.email }, req);

    res.status(200).json({
      user: userWithoutPassword,
      ...tokens,
    });
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new ApiError(400, "Refresh token is required."));
    }

    try {
      const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret) as { id: string; role: Role };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        return next(new ApiError(401, "User is no longer active."));
      }

      const tokens = generateTokens({ id: user.id, role: user.role });

      res.status(200).json(tokens);
    } catch (error) {
      return next(new ApiError(401, "Invalid or expired refresh token."));
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    if (req.user) {
      await auditService.logAction(req.user.id, "USER_LOGOUT", "USER", req.user.id, null, req);
    }
    res.status(200).json({ message: "Logged out successfully." });
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return 200 even if user doesn't exist for security reasons, so attackers don't verify emails.
      res.status(200).json({ message: "If the email is registered, a password reset link will be sent." });
      return;
    }

    // Generate simple token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expires = Date.now() + 3600000; // 1 hour

    resetTokens.set(token, { email, expires });

    await emailService.sendPasswordResetEmail(email, token);

    await auditService.logAction(user.id, "PASSWORD_RESET_REQUEST", "USER", user.id, { email }, req);

    res.status(200).json({ message: "If the email is registered, a password reset link will be sent." });
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    const { token, password } = req.body;

    const record = resetTokens.get(token);
    if (!record || record.expires < Date.now()) {
      return next(new ApiError(400, "Invalid or expired reset token."));
    }

    const user = await prisma.user.findUnique({ where: { email: record.email } });
    if (!user) {
      return next(new ApiError(404, "User not found."));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete token
    resetTokens.delete(token);

    await auditService.logAction(user.id, "PASSWORD_RESET_SUCCESS", "USER", user.id, null, req);

    res.status(200).json({ message: "Password reset successfully. You can now log in." });
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        studentProfile: true,
        supervisorProfile: true,
      },
    });

    if (!user) {
      return next(new ApiError(404, "User not found."));
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  }
}

export const authController = new AuthController();
export default authController;
