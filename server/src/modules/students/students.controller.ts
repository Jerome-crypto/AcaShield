import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { ProjectStatus } from "@prisma/client";

export class StudentsController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const studentId = req.user.id;

    const totalProjects = await prisma.project.count({ where: { studentId } });
    
    const pendingReviews = await prisma.project.count({
      where: {
        studentId,
        status: { in: [ProjectStatus.SUBMITTED, ProjectStatus.PROCESSING, ProjectStatus.UNDER_REVIEW] },
      },
    });

    const approvedProjects = await prisma.project.count({
      where: { studentId, status: ProjectStatus.APPROVED },
    });

    const revisionRequested = await prisma.project.count({
      where: { studentId, status: ProjectStatus.REVISION_REQUESTED },
    });

    // Average similarity score
    const avgScoreResult = await prisma.project.aggregate({
      where: {
        studentId,
        similarityScore: { not: null },
      },
      _avg: {
        similarityScore: true,
      },
    });

    const avgSimilarity = avgScoreResult._avg.similarityScore 
      ? Math.round(avgScoreResult._avg.similarityScore) 
      : 0;

    const recentProjects = await prisma.project.findMany({
      where: { studentId },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        supervisor: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    res.status(200).json({
      stats: {
        totalProjects,
        pendingReviews,
        approvedProjects,
        revisionRequested,
        avgSimilarity,
      },
      recentProjects,
    });
  }

  async getProjects(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const studentId = req.user.id;

    const projects = await prisma.project.findMany({
      where: { studentId },
      include: {
        supervisor: {
          select: { firstName: true, lastName: true, email: true },
        },
        department: true,
        programme: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    res.status(200).json(projects);
  }

  async getReports(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const studentId = req.user.id;

    const reports = await prisma.similarityReport.findMany({
      where: {
        project: { studentId },
      },
      include: {
        project: {
          select: { title: true, status: true },
        },
        document: {
          select: { fileName: true, version: true },
        },
      },
      orderBy: { generatedAt: "desc" },
    });

    res.status(200).json(reports);
  }

  async getActivity(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;

    const activities = await prisma.auditLog.findMany({
      where: { userId },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(activities);
  }
}

export const studentsController = new StudentsController();
export default studentsController;
