import { Router } from "express";
import settingsController from "./settings.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/rbac.middleware";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(authorize([Role.ADMIN]));

router.get("/", settingsController.getSettings);
router.patch("/", settingsController.updateSettings);

export default router;
