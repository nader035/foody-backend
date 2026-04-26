import { Router } from "express";
import {
  changeMyPassword,
  confirmResetPassword,
  forgotPassword,
  listUsers,
  login,
  logout,
  me,
  register,
  updateMe,
  createStaff,
  updateStaffStatus,
  listAccessibleCharities,
} from "../controllers/user.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", confirmResetPassword);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateMe);
router.patch("/change-password", requireAuth, changeMyPassword);
router.get(
  "/charities",
  requireAuth,
  requireRole("manager", "staff"),
  listAccessibleCharities,
);
router.get("/", requireAuth, requireRole("manager"), listUsers);
router.post("/staff", requireAuth, requireRole("manager"), createStaff);
router.patch(
  "/:userId/status",
  requireAuth,
  requireRole("manager"),
  updateStaffStatus,
);

export default router;
