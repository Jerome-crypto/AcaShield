import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import similarityService from "../../services/similarity.service";
import { ProjectStatus } from "@prisma/client";

export class PlagiarismController {
  async runCheck(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId },
      include: { documents: { orderBy: { version: "desc" }, take: 1 } },
    });

    if (!project) return next(new ApiError(404, "Project not found."));

    if (project.documents.length === 0) {
      return next(new ApiError(400, "No document found to check similarity."));
    }

    const latestDoc = project.documents[0];

    // Run check asynchronously
    setImmediate(async () => {
      await similarityService.checkProjectSimilarity(projectId, latestDoc.id);
    });

    res.status(202).json({ message: "Similarity check initiated. Results will be available shortly." });
  }

  async getReport(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { projectId } = req.params;

    const report = await prisma.similarityReport.findFirst({
      where: { projectId },
      orderBy: { generatedAt: "desc" },
      include: {
        document: { select: { fileName: true, version: true, uploadedAt: true } },
        project: { select: { title: true, status: true, student: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (!report) return next(new ApiError(404, "No similarity report found for this project."));

    res.status(200).json(report);
  }

  async downloadReport(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { projectId } = req.params;

    const report = await prisma.similarityReport.findFirst({
      where: { projectId },
      orderBy: { generatedAt: "desc" },
      include: {
        project: {
          include: {
            student: { select: { firstName: true, lastName: true } },
            supervisor: { select: { firstName: true, lastName: true, supervisorProfile: { select: { title: true } } } },
            department: true,
            programme: true,
          },
        },
        document: { select: { fileName: true, version: true } },
        matches: {
          take: 20,
          include: {
            matchedProject: { select: { title: true, academicYear: true } },
          },
        },
      },
    });

    if (!report) return next(new ApiError(404, "Similarity report not found."));

    // Build a simple JSON-based PDF report structure
    const reportData = {
      title: "Similarity Analysis Report",
      institution: "AcaShield Academic Integrity System",
      generatedAt: report.generatedAt,
      project: {
        title: report.project.title,
        student: `${report.project.student.firstName} ${report.project.student.lastName}`,
        supervisor: `${report.project.supervisor?.supervisorProfile?.title || ""} ${report.project.supervisor?.firstName} ${report.project.supervisor?.lastName}`,
        department: report.project.department?.name,
        programme: report.project.programme?.name,
        academicYear: report.project.academicYear,
      },
      document: report.document,
      overallScore: report.overallScore,
      riskLevel: report.riskLevel,
      summary: report.summary,
      matches: report.matches.map(m => ({
        matchedProject: m.matchedProject.title,
        similarityScore: m.similarityScore,
        sourceText: m.sourceText,
        matchedText: m.matchedText,
      })),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="similarity-report-${projectId}.json"`);
    res.status(200).json(reportData);
  }

  async getMatches(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    const { reportId } = req.params;

    const matches = await prisma.similarityMatch.findMany({
      where: { reportId },
      include: {
        matchedProject: {
          select: {
            title: true,
            academicYear: true,
            student: { select: { firstName: true, lastName: true } },
            department: { select: { name: true } },
          },
        },
        matchedDocument: { select: { fileName: true, version: true } },
      },
      orderBy: { similarityScore: "desc" },
    });

    res.status(200).json(matches);
  }
}

export const plagiarismController = new PlagiarismController();
export default plagiarismController;
