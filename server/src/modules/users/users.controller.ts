import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import prisma from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { getPaginationParams, getPaginationMeta } from "../../utils/pagination";
import { Role, UserStatus } from "@prisma/client";
import { auditService } from "../../services/audit.service";

export class UsersController {
  async listUsers(req: Request, res: Response, next: NextFunction) {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { role, status, q } = req.query;

    const where: any = {};
    if (role) where.role = role as Role;
    if (status) where.status = status as UserStatus;
    
    // Simple search by name or email
    if (q) {
      where.OR = [
        { firstName: { contains: q as string, mode: "insensitive" } },
        { lastName: { contains: q as string, mode: "insensitive" } },
        { email: { contains: q as string, mode: "insensitive" } },
      ];
    }

    const total = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        studentProfile: true,
        supervisorProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const usersWithoutPassword = users.map(user => {
      const { passwordHash: _, ...rest } = user;
      return rest;
    });

    res.status(200).json({
      data: usersWithoutPassword,
      meta: getPaginationMeta(total, page, limit),
    });
  }

  async getUser(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        supervisorProfile: true,
      },
    });

    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    const {
      email, password, firstName, lastName, role, phone, avatarUrl,
      studentNumber, registrationNumber, programme, department, academicYear,
      staffNumber, title, specialization
    } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new ApiError(400, "User with this email already exists."));
    }

    const passwordHash = await bcrypt.hash(password || "AcaShield@Default1", 10);

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
        await tx.studentProfile.create({
          data: {
            userId: user.id,
            studentNumber: studentNumber || `ST-${Date.now().toString().slice(-6)}`,
            registrationNumber: registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
            programme: programme || "BSc Computer Science",
            department: department || "Computer Science",
            academicYear: academicYear || "2024/2025",
          },
        });
      } else if (role === Role.SUPERVISOR) {
        await tx.supervisorProfile.create({
          data: {
            userId: user.id,
            staffNumber: staffNumber || `SN-${Date.now().toString().slice(-6)}`,
            department: department || "Computer Science",
            title: title || "Dr.",
            specialization: specialization || "General Academics",
          },
        });
      }

      return user;
    });

    const { passwordHash: _, ...userWithoutPassword } = result;

    await auditService.logAction(req.user?.id || null, "USER_CREATE_ADMIN", "USER", result.id, { email: result.email, role: result.role }, req);

    res.status(201).json(userWithoutPassword);
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const {
      firstName, lastName, phone, avatarUrl, status, role,
      studentNumber, registrationNumber, programme, department, academicYear,
      staffNumber, title, specialization
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true, supervisorProfile: true }
    });
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          firstName,
          lastName,
          phone,
          avatarUrl,
          status,
          role,
        },
      });

      if (u.role === Role.STUDENT) {
        await tx.studentProfile.upsert({
          where: { userId: id },
          update: {
            studentNumber,
            registrationNumber,
            programme,
            department,
            academicYear,
          },
          create: {
            userId: id,
            studentNumber: studentNumber || `ST-${Date.now().toString().slice(-6)}`,
            registrationNumber: registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
            programme: programme || "BSc Computer Science",
            department: department || "Computer Science",
            academicYear: academicYear || "2024/2025",
          },
        });
      } else if (u.role === Role.SUPERVISOR) {
        await tx.supervisorProfile.upsert({
          where: { userId: id },
          update: {
            staffNumber,
            department,
            title,
            specialization,
          },
          create: {
            userId: id,
            staffNumber: staffNumber || `SN-${Date.now().toString().slice(-6)}`,
            department: department || "Computer Science",
            title: title || "Dr.",
            specialization: specialization || "General Academics",
          },
        });
      }

      return tx.user.findUnique({
        where: { id },
        include: {
          studentProfile: true,
          supervisorProfile: true,
        },
      });
    });

    if (!updatedUser) {
      return next(new ApiError(500, "Update failed"));
    }

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;

    await auditService.logAction(req.user?.id || null, "USER_UPDATE_ADMIN", "USER", id, { changedFields: req.body }, req);

    res.status(200).json(userWithoutPassword);
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    // Set status to DELETED instead of hard delete to preserve audits and relations
    await prisma.user.update({
      where: { id },
      data: { status: UserStatus.DELETED },
    });

    await auditService.logAction(req.user?.id || null, "USER_DELETE_ADMIN", "USER", id, null, req);

    res.status(200).json({ message: "User deleted successfully." });
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(UserStatus).includes(status)) {
      return next(new ApiError(400, "Invalid user status."));
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
    });

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;

    await auditService.logAction(req.user?.id || null, "USER_STATUS_CHANGE", "USER", id, { status }, req);

    res.status(200).json(userWithoutPassword);
  }
}

export const usersController = new UsersController();
export default usersController;
