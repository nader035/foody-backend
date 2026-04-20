import { Router } from "express";
import {
  createBranch,
  getMyBranchById,
  listMyBranches,
  updateMyBranch,
} from "../controllers/branch.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole("manager"), createBranch);
router.get("/", listMyBranches);
router.get("/:branchId", requireRole("manager"), getMyBranchById);
router.patch("/:branchId", requireRole("manager"), updateMyBranch);

export default router;
