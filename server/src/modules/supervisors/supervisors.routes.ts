import { Router } from "express";
import supervisorsController from "./supervisors.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/rbac.middleware";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(authorize([Role.SUPERVISOR]));

router.get("/dashboard", supervisorsController.getDashboard);
router.get("/review-queue", supervisorsController.getReviewQueue);
router.get("/students", supervisorsController.getStudents);
router.get("/projects/:id", supervisorsController.getProjectDetails);

export default router;
