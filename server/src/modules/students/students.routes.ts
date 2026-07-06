import { Router } from "express";
import studentsController from "./students.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/rbac.middleware";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(authorize([Role.STUDENT]));

router.get("/dashboard", studentsController.getDashboard);
router.get("/projects", studentsController.getProjects);
router.get("/reports", studentsController.getReports);
router.get("/activity", studentsController.getActivity);

export default router;
