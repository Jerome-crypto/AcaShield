import { Router } from "express";
import departmentsController from "./departments.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

router.get("/", departmentsController.listDepartments);
router.get("/programmes", departmentsController.listProgrammes);
router.get("/supervisors", departmentsController.listSupervisors);

export default router;
