import { Router } from "express";
import reviewsController from "./reviews.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/rbac.middleware";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

router.post("/:projectId/approve", authorize([Role.SUPERVISOR]), reviewsController.approveProject);
router.post("/:projectId/request-revision", authorize([Role.SUPERVISOR]), reviewsController.requestRevision);
router.post("/:projectId/reject", authorize([Role.SUPERVISOR]), reviewsController.rejectProject);
router.post("/:projectId/comment", authorize([Role.SUPERVISOR]), reviewsController.postComment);
router.get("/:projectId/history", authorize([Role.STUDENT, Role.SUPERVISOR, Role.ADMIN]), reviewsController.getReviewHistory);

export default router;
