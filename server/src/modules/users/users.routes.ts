import { Router } from "express";
import usersController from "./users.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/rbac.middleware";
import { Role } from "@prisma/client";

const router = Router();

// Guard all routes with Admin-only access
router.use(authenticate);
router.use(authorize([Role.ADMIN]));

router.get("/", usersController.listUsers);
router.get("/:id", usersController.getUser);
router.post("/", usersController.createUser);
router.patch("/:id", usersController.updateUser);
router.delete("/:id", usersController.deleteUser);
router.patch("/:id/status", usersController.updateUserStatus);

export default router;
