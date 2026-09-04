import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import prisma from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { getPaginationParams, getPaginationMeta } from "../../utils/pagination";
import { ProjectStatus, Role } from "@prisma/client";
import { auditService } from "../../services/audit.service";
import documentParserService from "../../services/document-parser.service";
import similarityService from "../../services/similarity.service";

export class ProjectsController {
  constructor() {
    this.createProject = this.createProject.bind(this);
    this.listProjects = this.listProjects.bind(this);
    this.getProject = this.getProject.bind(this);
    this.updateProject = this.updateProject.bind(this);
    this.deleteProject = this.deleteProject.bind(this);
    this.uploadDocument = this.uploadDocument.bind(this);
    this.submitProject = this.submitProject.bind(this);
    this.resubmitProject = this.resubmitProject.bind(this);
    this.getDocument = this.getDocument.bind(this);
    this.getVersions = this.getVersions.bind(this);
    this.assignSupervisor = this.assignSupervisor.bind(this);
  }

  async createProject(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));

    const { title, abstract, keywords, category, academicYear, departmentId, programmeId, supervisorId } = req.body;

    const project = await prisma.project.create({
      data: {
        title,
        abstract,
        keywords,
        category,
        academicYear,
        departmentId,
        programmeId,
        studentId: req.user.id,
        supervisorId,
        status: ProjectStatus.DRAFT,
      },
    });

    await auditService.logAction(req.user.id, "PROJECT_CREATE", "PROJECT", project.id, { title }, req);

    res.status(201).json(project);
  }

  async listProjects(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));

    const { page, limit, skip } = getPaginationParams(req.query);
    const where: any = {};

    if (req.user.role === Role.STUDENT) {
      where.studentId = req.user.id;
    } else if (req.user.role === Role.SUPERVISOR) {
      where.supervisorId = req.user.id;
    }
    // ADMIN can see all

    const { status, q } = req.query;
    if (status) where.status = status as ProjectStatus;
    if (q) {
      where.OR = [
        { title: { contains: q as string, mode: "insensitive" } },
        { keywords: { contains: q as string, mode: "insensitive" } },
      ];
    }

    const total = await prisma.project.count({ where });
    const projects = await prisma.project.findMany({
      where,
      skip,
      take: limit,
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
        supervisor: { select: { firstName: true, lastName: true, email: true } },
        department: true,
        programme: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    res.status(200).json({ data: projects, meta: getPaginationMeta(total, page, limit) });
  }

  async getProject(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { id } = req.params;

    const where: any = { id };
    if (req.user.role === Role.STUDENT) where.studentId = req.user.id;
    else if (req.user.role === Role.SUPERVISOR) where.supervisorId = req.user.id;

    const project = await prisma.project.findFirst({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true, studentProfile: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, supervisorProfile: true } },
        department: true,
        programme: true,
        documents: { orderBy: { version: "desc" } },
        reviews: { orderBy: { createdAt: "desc" } },
        similarityReports: {
          orderBy: { generatedAt: "desc" },
          take: 1,
          include: { matches: { take: 10 } },
        },
      },
    });

    if (!project) return next(new ApiError(404, "Project not found"));
    res.status(200).json(project);
  }

  async updateProject(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, studentId: req.user.id },
    });

    if (!project) return next(new ApiError(404, "Project not found"));

    if (project.status === ProjectStatus.APPROVED || project.status === ProjectStatus.ARCHIVED) {
      return next(new ApiError(400, "Cannot edit an approved or archived project."));
    }

    const { title, abstract, keywords, category, academicYear, departmentId, programmeId, supervisorId } = req.body;

    const updated = await prisma.project.update({
      where: { id },
      data: { title, abstract, keywords, category, academicYear, departmentId, programmeId, supervisorId },
    });

    await auditService.logAction(req.user.id, "PROJECT_UPDATE", "PROJECT", id, { title: updated.title }, req);
    res.status(200).json(updated);
  }

  async deleteProject(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { id } = req.params;

    const where: any = { id };
    if (req.user.role === Role.STUDENT) where.studentId = req.user.id;

    const project = await prisma.project.findFirst({ where });
    if (!project) return next(new ApiError(404, "Project not found"));

    if (project.status === ProjectStatus.APPROVED || project.status === ProjectStatus.ARCHIVED) {
      return next(new ApiError(400, "Cannot delete an approved or archived project."));
    }

    await prisma.project.delete({ where: { id } });
    await auditService.logAction(req.user.id, "PROJECT_DELETE", "PROJECT", id, null, req);
    res.status(200).json({ message: "Project deleted" });
  }

  async uploadDocument(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { id } = req.params;

    if (!req.file) return next(new ApiError(400, "No file uploaded"));

    const project = await prisma.project.findFirst({
      where: { id, studentId: req.user.id },
    });
    if (!project) return next(new ApiError(404, "Project not found"));

    if (project.status === ProjectStatus.APPROVED || project.status === ProjectStatus.ARCHIVED) {
      return next(new ApiError(400, "Cannot upload to an approved or archived project."));
    }

    // Parse text from document
    let extractedText = "";
    try {
      extractedText = await documentParserService.extractText(req.file.buffer, req.file.mimetype);
    } catch (err) {
      console.error("Text extraction failed:", err);
    }

    // Calculate SHA-256 checksum of file buffer
    const checksum = crypto.createHash("sha256").update(req.file.buffer).digest("hex");

    // Determine version number
    const existingDocs = await prisma.projectDocument.count({ where: { projectId: id } });
    const version = existingDocs + 1;

    const fileExt = req.file.originalname.split(".").pop()?.toLowerCase() || "pdf";

    const doc = await prisma.projectDocument.create({
      data: {
        projectId: id,
        version,
        fileName: req.file.originalname,
        fileType: fileExt,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileData: req.file.buffer,
        extractedText,
        checksum,
      },
    });

    // Update project to latest version
    await prisma.project.update({
      where: { id },
      data: { currentVersion: version },
    });

    await auditService.logAction(req.user.id, "DOCUMENT_UPLOAD", "PROJECT", id, { version, fileName: req.file.originalname }, req);

    // Return doc without binary fileData
    const { fileData: _, ...docWithoutData } = doc;
    res.status(201).json(docWithoutData);
  }

  async submitProject(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, studentId: req.user.id },
      include: { documents: { orderBy: { version: "desc" }, take: 1 } },
    });

    if (!project) return next(new ApiError(404, "Project not found"));

    if (project.documents.length === 0) {
      return next(new ApiError(400, "Please upload a document before submitting."));
    }

    if (project.status !== ProjectStatus.DRAFT && project.status !== ProjectStatus.REVISION_REQUESTED) {
      return next(new ApiError(400, `Cannot submit a project with status: ${project.status}`));
    }

    const latestDoc = project.documents[0];

    const updated = await prisma.project.update({
      where: { id },
      data: {
        status: ProjectStatus.PROCESSING,
        submittedAt: new Date(),
      },
    });

    // Trigger similarity check async (non-blocking)
    setImmediate(async () => {
      try {
        await similarityService.checkProjectSimilarity(id, latestDoc.id);

        // Move to UNDER_REVIEW after similarity check completes
        await prisma.project.update({
          where: { id },
          data: { status: ProjectStatus.UNDER_REVIEW },
        });

        // Notify supervisor
        await prisma.notification.create({
          data: {
            userId: project.supervisorId,
            title: "New Project Submitted for Review",
            message: `A student has submitted project "${project.title}" for your review.`,
            type: "info",
          },
        });

        // Notify student
        await prisma.notification.create({
          data: {
            userId: project.studentId,
            title: "Similarity Report Ready",
            message: `Originality analysis for "${project.title}" is complete. Check your reports.`,
            type: "info",
          },
        });
      } catch (err) {
        console.error("Error in post-submission similarity check:", err);
        await prisma.project.update({
          where: { id },
          data: { status: ProjectStatus.SUBMITTED },
        });
      }
    });

    await auditService.logAction(req.user.id, "PROJECT_SUBMIT", "PROJECT", id, { title: project.title }, req);

    res.status(200).json({ message: "Project submitted successfully. Similarity analysis in progress.", project: updated });
  }

  async resubmitProject(req: Request, res: Response, next: NextFunction) {
    // Same logic as submit — student can resubmit after revision requested
    return this.submitProject(req, res, next);
  }

  async getDocument(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { id } = req.params;
    const { versionId, download } = req.query;

    const project = await prisma.project.findFirst({ where: { id } });
    if (!project) return next(new ApiError(404, "Project not found"));

    const whereDoc: any = { projectId: id };
    if (versionId) whereDoc.id = versionId as string;

    const doc = await prisma.projectDocument.findFirst({
      where: whereDoc,
      orderBy: { version: "desc" },
    });

    if (!doc) return next(new ApiError(404, "No document found for this project"));

    const isDownload = download === "true" || download === "1";
    res.setHeader("Content-Type", doc.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(doc.fileName)}"`);
    res.send(doc.fileData);
  }

  async getVersions(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { id } = req.params;

    const docs = await prisma.projectDocument.findMany({
      where: { projectId: id },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        checksum: true,
        uploadedAt: true,
        mimeType: true,
      },
    });

    res.status(200).json(docs);
  }

  async assignSupervisor(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { id } = req.params;
    const { supervisorId } = req.body;

    if (!supervisorId) {
      return next(new ApiError(400, "supervisorId is required."));
    }

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return next(new ApiError(404, "Project not found."));
    }

    const supervisor = await prisma.user.findFirst({
      where: { id: supervisorId, role: Role.SUPERVISOR },
    });

    if (!supervisor) {
      return next(new ApiError(400, "Invalid supervisor ID or user is not a supervisor."));
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { supervisorId },
      include: {
        supervisor: { select: { firstName: true, lastName: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: project.studentId,
        title: "Supervisor Reassigned",
        message: `Your project "${project.title}" has been assigned to supervisor ${updated.supervisor.firstName} ${updated.supervisor.lastName}.`,
        type: "info",
      },
    });

    await prisma.notification.create({
      data: {
        userId: supervisorId,
        title: "New Project Assigned",
        message: `You have been assigned as the supervisor for project "${project.title}".`,
        type: "info",
      },
    });

    await auditService.logAction(req.user.id, "PROJECT_ASSIGN_SUPERVISOR", "PROJECT", id, { supervisorId }, req);

    res.status(200).json(updated);
  }
}

export const projectsController = new ProjectsController();
export default projectsController;
