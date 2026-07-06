import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { ProjectStatus, ReviewDecision, Role } from "@prisma/client";
import { auditService } from "../../services/audit.service";

export class ReviewsController {
  async approveProject(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { projectId } = req.params;
    const { comments } = req.body;
    const supervisorId = req.user.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, supervisorId },
    });
    if (!project) return next(new ApiError(404, "Project not found or not assigned to you."));

    if (project.status !== ProjectStatus.UNDER_REVIEW && project.status !== ProjectStatus.SUBMITTED) {
      return next(new ApiError(400, `Cannot approve a project with status: ${project.status}`));
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          status: ProjectStatus.APPROVED,
          approvedAt: new Date(),
        },
      });

      await tx.review.create({
        data: {
          projectId,
          supervisorId,
          decision: ReviewDecision.APPROVED,
          comments: comments || "",
        },
      });

      // Notify student
      await tx.notification.create({
        data: {
          userId: project.studentId,
          title: "🎉 Project Approved!",
          message: `Your project "${project.title}" has been approved and is now in the repository.`,
          type: "success",
        },
      });
    });

    await auditService.logAction(supervisorId, "PROJECT_APPROVE", "PROJECT", projectId, { comments }, req);

    res.status(200).json({ message: "Project approved and added to repository." });
  }

  async requestRevision(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { projectId } = req.params;
    const { comments } = req.body;
    const supervisorId = req.user.id;

    if (!comments || comments.trim() === "") {
      return next(new ApiError(400, "Revision comments are required."));
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, supervisorId },
    });
    if (!project) return next(new ApiError(404, "Project not found or not assigned to you."));

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.REVISION_REQUESTED },
      });

      await tx.review.create({
        data: {
          projectId,
          supervisorId,
          decision: ReviewDecision.REVISION_REQUESTED,
          comments,
        },
      });

      await tx.notification.create({
        data: {
          userId: project.studentId,
          title: "Revision Requested",
          message: `Your supervisor has requested revisions on "${project.title}". Check the review comments.`,
          type: "warning",
        },
      });
    });

    await auditService.logAction(supervisorId, "PROJECT_REVISION_REQUESTED", "PROJECT", projectId, { comments }, req);

    res.status(200).json({ message: "Revision requested. Student has been notified." });
  }

  async rejectProject(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { projectId } = req.params;
    const { comments } = req.body;
    const supervisorId = req.user.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, supervisorId },
    });
    if (!project) return next(new ApiError(404, "Project not found or not assigned to you."));

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.REJECTED },
      });

      await tx.review.create({
        data: {
          projectId,
          supervisorId,
          decision: ReviewDecision.REJECTED,
          comments: comments || "",
        },
      });

      await tx.notification.create({
        data: {
          userId: project.studentId,
          title: "Project Rejected",
          message: `Your project "${project.title}" has been rejected. Please contact your supervisor for more information.`,
          type: "error",
        },
      });
    });

    await auditService.logAction(supervisorId, "PROJECT_REJECT", "PROJECT", projectId, { comments }, req);

    res.status(200).json({ message: "Project rejected. Student has been notified." });
  }

  async getReviewHistory(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { projectId } = req.params;

    // Verify access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(req.user.role === Role.STUDENT ? { studentId: req.user.id } : {}),
        ...(req.user.role === Role.SUPERVISOR ? { supervisorId: req.user.id } : {}),
      },
    });
    if (!project) return next(new ApiError(404, "Project not found."));

    const reviews = await prisma.review.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(reviews);
  }

  async postComment(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { projectId } = req.params;
    const { comments } = req.body;
    const supervisorId = req.user.id;

    if (!comments || comments.trim() === "") {
      return next(new ApiError(400, "Comment text is required."));
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, supervisorId },
    });
    if (!project) return next(new ApiError(404, "Project not found or not assigned to you."));

    const note = await prisma.review.create({
      data: {
        projectId,
        supervisorId,
        decision: null,
        comments,
        isNote: true,
      },
    });

    await prisma.notification.create({
      data: {
        userId: project.studentId,
        title: "New Supervisor Comment",
        message: `Your supervisor has left a note on project "${project.title}".`,
        type: "info",
      },
    });

    await auditService.logAction(supervisorId, "PROJECT_COMMENT", "PROJECT", projectId, { comments }, req);

    res.status(201).json(note);
  }
}

export const reviewsController = new ReviewsController();
export default reviewsController;
