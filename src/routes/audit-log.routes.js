import { Router } from "express";
import { listMyAuditLogs } from "../controllers/audit-log.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireRole("manager", "staff"));
router.get("/", listMyAuditLogs);

export default router;
