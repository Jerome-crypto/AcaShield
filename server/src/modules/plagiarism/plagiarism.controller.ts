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
    const { format } = req.query;

    const report = await prisma.similarityReport.findFirst({
      where: { projectId },
      orderBy: { generatedAt: "desc" },
      include: {
        project: {
          include: {
            student: { select: { firstName: true, lastName: true, email: true } },
            supervisor: { select: { firstName: true, lastName: true, supervisorProfile: { select: { title: true } } } },
            department: true,
            programme: true,
          },
        },
        document: { select: { fileName: true, version: true, uploadedAt: true } },
        matches: {
          take: 30,
          include: {
            matchedProject: { select: { title: true, academicYear: true, student: { select: { firstName: true, lastName: true } } } },
            matchedDocument: { select: { fileName: true, version: true } },
          },
        },
      },
    });

    if (!report) return next(new ApiError(404, "Similarity report not found."));

    if (format === "json") {
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
      return res.status(200).json(reportData);
    }

    const studentName = `${report.project.student.firstName} ${report.project.student.lastName}`;
    const supervisorTitle = report.project.supervisor?.supervisorProfile?.title ? `${report.project.supervisor.supervisorProfile.title} ` : "";
    const supervisorName = report.project.supervisor ? `${supervisorTitle}${report.project.supervisor.firstName} ${report.project.supervisor.lastName}` : "Unassigned";
    const dateFormatted = new Date(report.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const score = report.overallScore || 0;
    const riskColor = report.riskLevel === "HIGH" || report.riskLevel === "CRITICAL" ? "#DC2626" : report.riskLevel === "MEDIUM" ? "#D97706" : "#059669";
    const riskBg = report.riskLevel === "HIGH" || report.riskLevel === "CRITICAL" ? "#FEF2F2" : report.riskLevel === "MEDIUM" ? "#FFFBEB" : "#ECFDF5";

    const matchesHtml = report.matches.map((m, idx) => `
      <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; background: #FFFFFF;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #F3F4F6; padding-bottom: 8px;">
          <div>
            <span style="font-weight: 700; color: #111827; font-size: 14px;">Source #${idx + 1}: ${m.matchedProject?.title || "Archived Project"}</span>
            <div style="font-size: 12px; color: #6B7280; margin-top: 2px;">
              Author: ${m.matchedProject?.student?.firstName || ""} ${m.matchedProject?.student?.lastName || ""} · Academic Year: ${m.matchedProject?.academicYear || "—"}
            </div>
          </div>
          <span style="background: #ECFDF5; color: #065F46; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 20px; border: 1px solid #A7F3D0;">
            ${m.similarityScore}% Match
          </span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; line-height: 1.6;">
          <div style="background: #FEF2F2; padding: 12px; border-radius: 6px; border: 1px solid #FEE2E2;">
            <div style="font-weight: 700; color: #991B1B; margin-bottom: 6px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Student Submission Excerpt</div>
            <div style="color: #374151; font-family: monospace;">${m.matchedText}</div>
          </div>
          <div style="background: #F0FDF4; padding: 12px; border-radius: 6px; border: 1px solid #DCFCE7;">
            <div style="font-weight: 700; color: #166534; margin-bottom: 6px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Matched Archive Source Text</div>
            <div style="color: #374151; font-family: monospace;">${m.sourceText}</div>
          </div>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AcaShield Originality Report - ${encodeURIComponent(report.project.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #F9FAFB; color: #111827; padding: 32px 16px; }
    .container { max-width: 900px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #065F46; padding-bottom: 24px; margin-bottom: 28px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon { width: 36px; height: 36px; background: #065F46; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 20px; }
    .brand-name { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
    .report-badge { background: #F3F4F6; color: #4B5563; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 28px; }
    .meta-item label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6B7280; margin-bottom: 4px; }
    .meta-item div { font-size: 14px; font-weight: 600; color: #1F2937; }
    .score-banner { display: flex; align-items: center; justify-content: space-between; background: ${riskBg}; border: 1px solid ${riskColor}40; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px; }
    .score-left { display: flex; align-items: center; gap: 20px; }
    .score-circle { width: 70px; height: 70px; border-radius: 50%; background: ${riskColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; box-shadow: 0 4px 10px ${riskColor}40; }
    .score-info h3 { font-size: 16px; font-weight: 700; color: #111827; }
    .score-info p { font-size: 13px; color: #4B5563; margin-top: 2px; }
    .risk-pill { background: ${riskColor}; color: white; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .section-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
    .action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-bottom: 24px; }
    .btn { background: #065F46; color: white; border: none; border-radius: 8px; padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn-secondary { background: white; color: #374151; border: 1px solid #D1D5DB; }
    .btn:hover { opacity: 0.9; }
    @media print {
      body { background: white; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; }
      .action-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="action-bar">
      <button class="btn btn-secondary" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn" onclick="window.close()">Close Window</button>
    </div>

    <div class="header">
      <div>
        <div class="brand">
          <div class="brand-icon">🛡️</div>
          <div class="brand-name">AcaShield</div>
        </div>
        <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">Institutional Academic Integrity & Plagiarism Analysis Engine</div>
      </div>
      <div style="text-align: right;">
        <span class="report-badge">Official Originality Report</span>
        <div style="font-size: 11px; color: #9CA3AF; margin-top: 6px;">Generated: ${dateFormatted}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <label>Project Title</label>
        <div>${report.project.title}</div>
      </div>
      <div class="meta-item">
        <label>Student Author</label>
        <div>${studentName} (${report.project.student.email})</div>
      </div>
      <div class="meta-item">
        <label>Department & Programme</label>
        <div>${report.project.department?.name || "—"} · ${report.project.programme?.name || "—"}</div>
      </div>
      <div class="meta-item">
        <label>Assigned Supervisor</label>
        <div>${supervisorName}</div>
      </div>
      <div class="meta-item">
        <label>Uploaded Document</label>
        <div>${report.document.fileName} (v${report.document.version})</div>
      </div>
      <div class="meta-item">
        <label>Academic Year</label>
        <div>${report.project.academicYear}</div>
      </div>
    </div>

    <div class="score-banner">
      <div class="score-left">
        <div class="score-circle">${score}%</div>
        <div class="score-info">
          <h3>Overall Similarity Index</h3>
          <p>${report.summary || `Analysis completed against institutional repository.`}</p>
        </div>
      </div>
      <div class="risk-pill">${report.riskLevel} Risk</div>
    </div>

    <div class="section-title">
      <span>Matched Archive Sources (${report.matches.length})</span>
      <span style="font-size: 12px; font-weight: 500; color: #6B7280;">High syntactical sentence overlaps detected</span>
    </div>

    ${report.matches.length === 0 ? `
      <div style="text-align: center; padding: 40px; border: 1px dashed #D1D5DB; border-radius: 8px; color: #065F46; background: #ECFDF5;">
        <div style="font-size: 28px; margin-bottom: 8px;">✓</div>
        <div style="font-weight: 700; font-size: 14px;">No Significant Overlap Detected</div>
        <div style="font-size: 12px; color: #047857; margin-top: 4px;">This submission demonstrates high originality relative to all archived repository documents.</div>
      </div>
    ` : matchesHtml}

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; font-size: 11px; color: #9CA3AF;">
      <div>AcaShield Security Hash: ${report.id}</div>
      <div>Confidential Institutional Record · Authorized Access Only</div>
    </div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="originality-report-${projectId}.html"`);
    res.send(html);
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
