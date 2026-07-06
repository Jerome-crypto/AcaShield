import { Router } from "express";
import projectsController from "./projects.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/rbac.middleware";
import { upload } from "../../middleware/upload.middleware";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

// Create, list, get, update, delete
router.post("/", authorize([Role.STUDENT]), projectsController.createProject);
router.get("/", authorize([Role.STUDENT, Role.SUPERVISOR, Role.ADMIN]), projectsController.listProjects);
router.get("/:id", authorize([Role.STUDENT, Role.SUPERVISOR, Role.ADMIN]), projectsController.getProject);
router.patch("/:id", authorize([Role.STUDENT]), projectsController.updateProject);
router.delete("/:id", authorize([Role.STUDENT, Role.ADMIN]), projectsController.deleteProject);
router.patch("/:id/assign-supervisor", authorize([Role.ADMIN]), projectsController.assignSupervisor);

// Document handling
router.post("/:id/upload", authorize([Role.STUDENT]), upload.single("document"), projectsController.uploadDocument);
router.post("/:id/submit", authorize([Role.STUDENT]), projectsController.submitProject);
router.post("/:id/resubmit", authorize([Role.STUDENT]), projectsController.resubmitProject);
router.get("/:id/document", authorize([Role.STUDENT, Role.SUPERVISOR, Role.ADMIN]), projectsController.getDocument);
router.get("/:id/versions", authorize([Role.STUDENT, Role.SUPERVISOR, Role.ADMIN]), projectsController.getVersions);

export default router;
