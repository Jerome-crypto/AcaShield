import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { ProjectStatus } from "@prisma/client";

export class SupervisorsController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const supervisorId = req.user.id;

    // Distinct student count
    const studentCountResult = await prisma.project.groupBy({
      by: ["studentId"],
      where: { supervisorId },
    });
    const totalStudents = studentCountResult.length;

    const pendingReviews = await prisma.project.count({
      where: {
        supervisorId,
        status: { in: [ProjectStatus.SUBMITTED, ProjectStatus.PROCESSING, ProjectStatus.UNDER_REVIEW] },
      },
    });

    const approvedProjects = await prisma.project.count({
      where: { supervisorId, status: ProjectStatus.APPROVED },
    });

    // Average similarity score of projects
    const avgScoreResult = await prisma.project.aggregate({
      where: {
        supervisorId,
        similarityScore: { not: null },
      },
      _avg: {
        similarityScore: true,
      },
    });

    const avgSimilarity = avgScoreResult._avg.similarityScore 
      ? Math.round(avgScoreResult._avg.similarityScore) 
      : 0;

    const recentSubmissions = await prisma.project.findMany({
      where: {
        supervisorId,
        status: { in: [ProjectStatus.SUBMITTED, ProjectStatus.UNDER_REVIEW, ProjectStatus.REVISION_REQUESTED] },
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        student: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    res.status(200).json({
      stats: {
        totalStudents,
        pendingReviews,
        approvedProjects,
        avgSimilarity,
      },
      recentSubmissions,
    });
  }

  async getReviewQueue(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const supervisorId = req.user.id;

    const queue = await prisma.project.findMany({
      where: {
        supervisorId,
        status: { in: [ProjectStatus.SUBMITTED, ProjectStatus.PROCESSING, ProjectStatus.UNDER_REVIEW] },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentProfile: true,
          },
        },
        department: true,
        programme: true,
        documents: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy: { submittedAt: "asc" }, // Oldest first
    });

    res.status(200).json(queue);
  }

  async getStudents(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const supervisorId = req.user.id;

    // Fetch all projects assigned to this supervisor
    const projects = await prisma.project.findMany({
      where: { supervisorId },
      include: {
        student: {
          include: {
            studentProfile: true,
          },
        },
      },
    });

    // Map unique students
    const studentMap = new Map<string, any>();
    for (const p of projects) {
      if (!studentMap.has(p.studentId)) {
        const { passwordHash: _, ...studentWithoutPassword } = p.student;
        studentMap.set(p.studentId, {
          ...studentWithoutPassword,
          projectTitle: p.title,
          projectStatus: p.status,
          projectSimilarity: p.similarityScore,
        });
      }
    }

    res.status(200).json(Array.from(studentMap.values()));
  }

  async getProjectDetails(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { id } = req.params;
    const supervisorId = req.user.id;

    const project = await prisma.project.findFirst({
      where: {
        id,
        // Make sure it belongs to the supervisor
        supervisorId,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentProfile: true,
          },
        },
        department: true,
        programme: true,
        documents: {
          orderBy: { version: "desc" },
        },
        similarityReports: {
          orderBy: { generatedAt: "desc" },
          take: 1,
          include: {
            matches: {
              include: {
                matchedProject: {
                  select: { title: true, student: { select: { firstName: true, lastName: true } } },
                },
              },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return next(new ApiError(404, "Project not found or not assigned to you."));
    }

    res.status(200).json(project);
  }
}

export const supervisorsController = new SupervisorsController();
export default supervisorsController;
