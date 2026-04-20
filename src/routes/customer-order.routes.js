import { Router } from "express";
import {
  changeOrderStatus,
  checkoutOrders,
  createOrder,
  listMyOrders,
} from "../controllers/customer-order.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.post("/checkout", requireRole("customer"), checkoutOrders);
router.post("/", requireRole("customer"), createOrder);
router.get("/", requireRole("customer", "manager"), listMyOrders);
router.patch(
  "/:orderId/status",
  requireRole("customer", "manager"),
  changeOrderStatus,
);

export default router;
