import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { getPaginationParams, getPaginationMeta } from "../../utils/pagination";
import { ProjectStatus } from "@prisma/client";

export class RepositoryController {
  async searchProjects(req: Request, res: Response, next: NextFunction) {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { q, department, programme, supervisor, year, category } = req.query;

    const where: any = {
      status: { in: [ProjectStatus.APPROVED, ProjectStatus.ARCHIVED] },
    };

    if (q) {
      where.OR = [
        { title: { contains: q as string, mode: "insensitive" } },
        { abstract: { contains: q as string, mode: "insensitive" } },
        { keywords: { contains: q as string, mode: "insensitive" } },
      ];
    }

    if (department) {
      where.department = { name: { contains: department as string, mode: "insensitive" } };
    }

    if (programme) {
      where.programme = { name: { contains: programme as string, mode: "insensitive" } };
    }

    if (supervisor) {
      where.supervisor = {
        OR: [
          { firstName: { contains: supervisor as string, mode: "insensitive" } },
          { lastName: { contains: supervisor as string, mode: "insensitive" } },
        ],
      };
    }

    if (year) where.academicYear = year as string;
    if (category) where.category = { contains: category as string, mode: "insensitive" };

    const total = await prisma.project.count({ where });
    const projects = await prisma.project.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        abstract: true,
        keywords: true,
        category: true,
        academicYear: true,
        status: true,
        similarityScore: true,
        riskLevel: true,
        approvedAt: true,
        student: { select: { firstName: true, lastName: true } },
        supervisor: { select: { firstName: true, lastName: true, supervisorProfile: { select: { title: true } } } },
        department: { select: { name: true, code: true } },
        programme: { select: { name: true, code: true } },
      },
      orderBy: { approvedAt: "desc" },
    });

    res.status(200).json({ data: projects, meta: getPaginationMeta(total, page, limit) });
  }

  async listRepositoryProjects(req: Request, res: Response, next: NextFunction) {
    return this.searchProjects(req, res, next);
  }

  async getRepositoryProject(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        status: { in: [ProjectStatus.APPROVED, ProjectStatus.ARCHIVED] },
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        supervisor: {
          select: {
            firstName: true,
            lastName: true,
            supervisorProfile: { select: { title: true, department: true } },
          },
        },
        department: true,
        programme: true,
        documents: {
          orderBy: { version: "desc" },
          take: 1,
          select: { id: true, version: true, fileName: true, fileSize: true, mimeType: true, uploadedAt: true },
        },
        similarityReports: {
          orderBy: { generatedAt: "desc" },
          take: 1,
          select: { overallScore: true, riskLevel: true, summary: true },
        },
      },
    });

    if (!project) return next(new ApiError(404, "Project not found in repository."));
    res.status(200).json(project);
  }

  async downloadDocument(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { preview } = req.query;

    const project = await prisma.project.findFirst({
      where: {
        id,
        status: { in: [ProjectStatus.APPROVED, ProjectStatus.ARCHIVED] },
      },
      include: {
        documents: { orderBy: { version: "desc" }, take: 1 },
      },
    });

    if (!project || project.documents.length === 0) {
      return next(new ApiError(404, "Document not found."));
    }

    const doc = project.documents[0];
    const isPreview = preview === "true" || preview === "1";
    res.setHeader("Content-Type", doc.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `${isPreview ? "inline" : "attachment"}; filename="${encodeURIComponent(doc.fileName)}"`);
    res.send(doc.fileData);
  }

  async getFilters(req: Request, res: Response, next: NextFunction) {
    const [departments, programmes, years, categories] = await Promise.all([
      prisma.department.findMany({ select: { id: true, name: true, code: true } }),
      prisma.programme.findMany({ select: { id: true, name: true, code: true, departmentId: true } }),
      prisma.project.findMany({
        where: { status: { in: [ProjectStatus.APPROVED, ProjectStatus.ARCHIVED] } },
        distinct: ["academicYear"],
        select: { academicYear: true },
        orderBy: { academicYear: "desc" },
      }),
      prisma.project.findMany({
        where: { status: { in: [ProjectStatus.APPROVED, ProjectStatus.ARCHIVED] } },
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" },
      }),
    ]);

    res.status(200).json({
      departments,
      programmes,
      years: years.map(y => y.academicYear),
      categories: categories.map(c => c.category),
    });
  }
}

export const repositoryController = new RepositoryController();
export default repositoryController;
