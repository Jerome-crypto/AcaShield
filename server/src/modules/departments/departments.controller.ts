import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { auditService } from "../../services/audit.service";
import { Role } from "@prisma/client";

export class DepartmentsController {
  async listDepartments(req: Request, res: Response, next: NextFunction) {
    const departments = await prisma.department.findMany({
      include: {
        programmes: true,
        _count: { select: { projects: true } },
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json(departments);
  }

  async createDepartment(req: Request, res: Response, next: NextFunction) {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return next(new ApiError(400, "Department name and code are required."));
    }

    const existingName = await prisma.department.findFirst({
      where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { code: { equals: code, mode: "insensitive" } }] },
    });
    if (existingName) {
      return next(new ApiError(400, "A department with this name or code already exists."));
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
      },
      include: { programmes: true },
    });

    await auditService.logAction(req.user?.id || null, "DEPARTMENT_CREATE", "DEPARTMENT", department.id, { name: department.name, code: department.code }, req);

    res.status(201).json(department);
  }

  async updateDepartment(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { name, code, description } = req.body;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      return next(new ApiError(404, "Department not found."));
    }

    if (name || code) {
      const conflict = await prisma.department.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(name ? [{ name: { equals: name, mode: "insensitive" as const } }] : []),
            ...(code ? [{ code: { equals: code, mode: "insensitive" as const } }] : []),
          ],
        },
      });
      if (conflict) {
        return next(new ApiError(400, "Another department already uses this name or code."));
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(code ? { code: code.trim().toUpperCase() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
      },
      include: { programmes: true },
    });

    await auditService.logAction(req.user?.id || null, "DEPARTMENT_UPDATE", "DEPARTMENT", id, { changed: req.body }, req);

    res.status(200).json(updated);
  }

  async deleteDepartment(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { projects: true, programmes: true } } },
    });
    if (!department) {
      return next(new ApiError(404, "Department not found."));
    }

    if (department._count.projects > 0) {
      return next(new ApiError(400, `Cannot delete department "${department.name}" because it contains ${department._count.projects} projects.`));
    }

    await prisma.department.delete({ where: { id } });

    await auditService.logAction(req.user?.id || null, "DEPARTMENT_DELETE", "DEPARTMENT", id, { name: department.name }, req);

    res.status(200).json({ message: "Department deleted successfully." });
  }

  async listProgrammes(req: Request, res: Response, next: NextFunction) {
    const { departmentId } = req.query;
    const where: any = {};
    if (departmentId) where.departmentId = departmentId as string;

    const programmes = await prisma.programme.findMany({
      where,
      include: {
        department: true,
        _count: { select: { projects: true } },
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json(programmes);
  }

  async createProgramme(req: Request, res: Response, next: NextFunction) {
    const { name, code, departmentId } = req.body;

    if (!name || !code || !departmentId) {
      return next(new ApiError(400, "Programme name, code, and departmentId are required."));
    }

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) {
      return next(new ApiError(404, "Target department not found."));
    }

    const existing = await prisma.programme.findFirst({
      where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { code: { equals: code, mode: "insensitive" } }] },
    });
    if (existing) {
      return next(new ApiError(400, "A programme with this name or code already exists."));
    }

    const programme = await prisma.programme.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        departmentId,
      },
      include: { department: true },
    });

    await auditService.logAction(req.user?.id || null, "PROGRAMME_CREATE", "PROGRAMME", programme.id, { name: programme.name, department: dept.name }, req);

    res.status(201).json(programme);
  }

  async updateProgramme(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { name, code, departmentId } = req.body;

    const existing = await prisma.programme.findUnique({ where: { id } });
    if (!existing) {
      return next(new ApiError(404, "Programme not found."));
    }

    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) return next(new ApiError(404, "Department not found."));
    }

    if (name || code) {
      const conflict = await prisma.programme.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(name ? [{ name: { equals: name, mode: "insensitive" as const } }] : []),
            ...(code ? [{ code: { equals: code, mode: "insensitive" as const } }] : []),
          ],
        },
      });
      if (conflict) {
        return next(new ApiError(400, "Another programme already uses this name or code."));
      }
    }

    const updated = await prisma.programme.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(code ? { code: code.trim().toUpperCase() } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      include: { department: true },
    });

    await auditService.logAction(req.user?.id || null, "PROGRAMME_UPDATE", "PROGRAMME", id, { changed: req.body }, req);

    res.status(200).json(updated);
  }

  async deleteProgramme(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    const programme = await prisma.programme.findUnique({
      where: { id },
      include: { _count: { select: { projects: true } } },
    });
    if (!programme) {
      return next(new ApiError(404, "Programme not found."));
    }

    if (programme._count.projects > 0) {
      return next(new ApiError(400, `Cannot delete programme "${programme.name}" because it is linked to ${programme._count.projects} projects.`));
    }

    await prisma.programme.delete({ where: { id } });

    await auditService.logAction(req.user?.id || null, "PROGRAMME_DELETE", "PROGRAMME", id, { name: programme.name }, req);

    res.status(200).json({ message: "Programme deleted successfully." });
  }

  async listSupervisors(req: Request, res: Response, next: NextFunction) {
    const supervisors = await prisma.user.findMany({
      where: { role: Role.SUPERVISOR, status: "ACTIVE" },
      include: { supervisorProfile: true },
      orderBy: { lastName: "asc" },
    });
    const safe = supervisors.map(({ passwordHash: _, ...s }) => s);
    res.status(200).json(safe);
  }
}

export const departmentsController = new DepartmentsController();
export default departmentsController;
