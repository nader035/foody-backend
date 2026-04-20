import { Router } from "express";
import {
  changeMealStatus,
  createMeal,
  getMealById,
  listMeals,
  updateMeal,
} from "../controllers/surplus-meal.controller.js";
import {
  optionalAuth,
  requireAuth,
  requireRole,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", optionalAuth, listMeals);
router.get("/:mealId", optionalAuth, getMealById);
router.post("/", requireAuth, requireRole("manager", "staff"), createMeal);
router.patch(
  "/:mealId",
  requireAuth,
  requireRole("manager", "staff"),
  updateMeal,
);
router.patch(
  "/:mealId/status",
  requireAuth,
  requireRole("manager", "staff"),
  changeMealStatus,
);

export default router;
