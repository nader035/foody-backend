import { z } from "zod";
import {
  MEAL_CATEGORIES,
  SURPLUS_MEAL_STATUS,
} from "../constants/domain.constants.js";

function normalizeMealCategory(value) {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, " ");
  const categoryMap = {
    breakfast: "breakfast",
    brunch: "breakfast",
    lunch: "lunch",
    "main course": "lunch",
    dinner: "dinner",
    "side dish": "other",
    side: "other",
    bakery: "bakery",
    dessert: "bakery",
    beverage: "beverage",
    drinks: "beverage",
    drink: "beverage",
    other: "other",
  };

  return categoryMap[normalized] ?? value;
}

const mealCategorySchema = z.preprocess(
  normalizeMealCategory,
  z.enum(MEAL_CATEGORIES),
);

export const createSurplusMealSchema = z.object({
  branchId: z.string().min(10),
  title: z.string().min(2).max(140),
  description: z.string().max(600).optional(),
  category: mealCategorySchema.optional(),
  quantityTotal: z.number().int().min(1),
  quantityAvailable: z.number().int().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  currency: z.string().min(3).max(6).optional(),
  visibility: z
    .object({
      allowDonation: z.boolean().optional(),
      allowMarketplace: z.boolean().optional(),
    })
    .optional(),
  expiresAt: z.iso.datetime(),
  images: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const updateSurplusMealSchema = createSurplusMealSchema
  .omit({ branchId: true })
  .partial();

export const updateSurplusMealStatusSchema = z.object({
  status: z.enum(SURPLUS_MEAL_STATUS),
});
