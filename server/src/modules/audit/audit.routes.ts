import { Router } from "express";
import auditController from "./audit.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/rbac.middleware";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(authorize([Role.ADMIN]));

router.get("/", auditController.getLogs);
router.get("/:id", auditController.getLog);

export default router;
