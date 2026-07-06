import { Router } from "express";
import repositoryController from "./repository.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

// Repository is accessible to all authenticated users
router.use(authenticate);

router.get("/search", repositoryController.searchProjects);
router.get("/projects", repositoryController.listRepositoryProjects);
router.get("/projects/:id", repositoryController.getRepositoryProject);
router.get("/projects/:id/download", repositoryController.downloadDocument);
router.get("/filters", repositoryController.getFilters);

export default router;
