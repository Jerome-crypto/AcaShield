import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";

export class DepartmentsController {
  async listDepartments(req: Request, res: Response, next: NextFunction) {
    const departments = await prisma.department.findMany({
      include: { programmes: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json(departments);
  }

  async listProgrammes(req: Request, res: Response, next: NextFunction) {
    const { departmentId } = req.query;
    const where: any = {};
    if (departmentId) where.departmentId = departmentId as string;

    const programmes = await prisma.programme.findMany({
      where,
      include: { department: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json(programmes);
  }

  async listSupervisors(req: Request, res: Response, next: NextFunction) {
    const { Role } = await import("@prisma/client");
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
