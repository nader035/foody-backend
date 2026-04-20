import { Router } from "express";
import {
  changeDonationStatus,
  createDonation,
  listMyDonations,
} from "../controllers/donation.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole("manager", "staff"), createDonation);
router.get("/", requireRole("manager", "staff", "charity"), listMyDonations);
router.patch(
  "/:donationId/status",
  requireRole("manager", "staff", "charity"),
  changeDonationStatus,
);

export default router;
