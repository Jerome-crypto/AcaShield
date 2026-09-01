import { Router } from "express";
import departmentsController from "./departments.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/rbac.middleware";
import { Role } from "@prisma/client";

const router = Router();
router.use(authenticate);

// Public read for all authenticated users
router.get("/", departmentsController.listDepartments);
router.get("/programmes", departmentsController.listProgrammes);
router.get("/supervisors", departmentsController.listSupervisors);

// Admin-only management endpoints
router.post("/", authorize([Role.ADMIN]), departmentsController.createDepartment);
router.patch("/:id", authorize([Role.ADMIN]), departmentsController.updateDepartment);
router.delete("/:id", authorize([Role.ADMIN]), departmentsController.deleteDepartment);

router.post("/programmes", authorize([Role.ADMIN]), departmentsController.createProgramme);
router.patch("/programmes/:id", authorize([Role.ADMIN]), departmentsController.updateProgramme);
router.delete("/programmes/:id", authorize([Role.ADMIN]), departmentsController.deleteProgramme);

export default router;
