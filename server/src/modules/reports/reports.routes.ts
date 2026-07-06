import { Router } from "express";
import reportsController from "./reports.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/rbac.middleware";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(authorize([Role.ADMIN, Role.SUPERVISOR]));

router.get("/dashboard", reportsController.getDashboard);
router.get("/submission-trends", reportsController.getSubmissionTrends);
router.get("/similarity-trends", reportsController.getSimilarityTrends);
router.get("/repository-growth", reportsController.getRepositoryGrowth);
router.get("/department-performance", reportsController.getDepartmentPerformance);

export default router;
