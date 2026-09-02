"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsController = exports.ReportsController = void 0;
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
const client_1 = require("@prisma/client");
class ReportsController {
    async getDashboard(req, res, next) {
        if (!req.user)
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        const [totalProjects, totalUsers, approvedProjects, pendingProjects, totalDocuments, avgSimilarityResult,] = await Promise.all([
            database_1.default.project.count(),
            database_1.default.user.count(),
            database_1.default.project.count({ where: { status: client_1.ProjectStatus.APPROVED } }),
            database_1.default.project.count({ where: { status: { in: [client_1.ProjectStatus.SUBMITTED, client_1.ProjectStatus.UNDER_REVIEW, client_1.ProjectStatus.PROCESSING] } } }),
            database_1.default.projectDocument.count(),
            database_1.default.project.aggregate({
                where: { similarityScore: { not: null } },
                _avg: { similarityScore: true },
            }),
        ]);
        const riskDistribution = await database_1.default.project.groupBy({
            by: ["riskLevel"],
            _count: { _all: true },
            where: { riskLevel: { not: null } },
        });
        const departmentBreakdown = await database_1.default.project.groupBy({
            by: ["departmentId"],
            _count: { _all: true },
        });
        const deptDetails = await database_1.default.department.findMany({ select: { id: true, name: true } });
        const deptMap = new Map(deptDetails.map(d => [d.id, d.name]));
        res.status(200).json({
            summary: {
                totalProjects,
                totalUsers,
                approvedProjects,
                pendingProjects,
                totalDocuments,
                avgSimilarity: Math.round(avgSimilarityResult._avg.similarityScore || 0),
            },
            riskDistribution: riskDistribution.map(r => ({
                riskLevel: r.riskLevel,
                count: r._count._all,
            })),
            departmentBreakdown: departmentBreakdown.map(d => ({
                department: deptMap.get(d.departmentId) || "Unknown",
                count: d._count._all,
            })),
        });
    }
    async getSubmissionTrends(req, res, next) {
        // Get monthly submission counts for the last 12 months
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
        const projects = await database_1.default.project.findMany({
            where: { submittedAt: { gte: twelveMonthsAgo } },
            select: { submittedAt: true, status: true },
        });
        const monthlyMap = new Map();
        for (const p of projects) {
            if (!p.submittedAt)
                continue;
            const key = `${p.submittedAt.getFullYear()}-${String(p.submittedAt.getMonth() + 1).padStart(2, "0")}`;
            if (!monthlyMap.has(key))
                monthlyMap.set(key, { submissions: 0, approved: 0, rejected: 0 });
            const entry = monthlyMap.get(key);
            entry.submissions++;
            if (p.status === client_1.ProjectStatus.APPROVED)
                entry.approved++;
            if (p.status === client_1.ProjectStatus.REJECTED)
                entry.rejected++;
        }
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const result = Array.from(monthlyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, v]) => {
            const [year, month] = key.split("-");
            return { month: monthNames[parseInt(month) - 1], year, ...v };
        });
        res.status(200).json(result);
    }
    async getSimilarityTrends(req, res, next) {
        const distribution = {
            "0-10%": 0, "11-20%": 0, "21-30%": 0,
            "31-40%": 0, "41-50%": 0, "51%+": 0,
        };
        const projects = await database_1.default.project.findMany({
            where: { similarityScore: { not: null } },
            select: { similarityScore: true },
        });
        for (const p of projects) {
            const score = p.similarityScore;
            if (score <= 10)
                distribution["0-10%"]++;
            else if (score <= 20)
                distribution["11-20%"]++;
            else if (score <= 30)
                distribution["21-30%"]++;
            else if (score <= 40)
                distribution["31-40%"]++;
            else if (score <= 50)
                distribution["41-50%"]++;
            else
                distribution["51%+"]++;
        }
        res.status(200).json(Object.entries(distribution).map(([range, count]) => ({ range, count })));
    }
    async getRepositoryGrowth(req, res, next) {
        const projects = await database_1.default.project.findMany({
            where: {
                status: { in: [client_1.ProjectStatus.APPROVED, client_1.ProjectStatus.ARCHIVED] },
                approvedAt: { not: null },
            },
            select: { approvedAt: true },
            orderBy: { approvedAt: "asc" },
        });
        let cumulativeCount = 0;
        const byMonth = new Map();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (const p of projects) {
            if (!p.approvedAt)
                continue;
            const key = `${monthNames[p.approvedAt.getMonth()]} ${p.approvedAt.getFullYear()}`;
            cumulativeCount++;
            byMonth.set(key, cumulativeCount);
        }
        res.status(200).json(Array.from(byMonth.entries()).map(([month, total]) => ({ month, total })));
    }
    async getDepartmentPerformance(req, res, next) {
        const departments = await database_1.default.department.findMany({
            include: {
                projects: {
                    select: { status: true, similarityScore: true },
                },
            },
        });
        const result = departments.map(d => {
            const total = d.projects.length;
            const approved = d.projects.filter(p => p.status === client_1.ProjectStatus.APPROVED).length;
            const scores = d.projects.filter(p => p.similarityScore !== null).map(p => p.similarityScore);
            const avgSimilarity = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            return {
                department: d.name,
                total,
                approved,
                approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
                avgSimilarity,
            };
        });
        res.status(200).json(result);
    }
}
exports.ReportsController = ReportsController;
exports.reportsController = new ReportsController();
exports.default = exports.reportsController;
