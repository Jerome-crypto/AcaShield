import { Router } from "express";
import plagiarismController from "./plagiarism.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/rbac.middleware";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

router.post("/check/:projectId", authorize([Role.STUDENT, Role.SUPERVISOR, Role.ADMIN]), plagiarismController.runCheck);
router.get("/report/:projectId", authorize([Role.STUDENT, Role.SUPERVISOR, Role.ADMIN]), plagiarismController.getReport);
router.get("/report/:projectId/download", authorize([Role.STUDENT, Role.SUPERVISOR, Role.ADMIN]), plagiarismController.downloadReport);
router.get("/matches/:reportId", authorize([Role.STUDENT, Role.SUPERVISOR, Role.ADMIN]), plagiarismController.getMatches);

export default router;
