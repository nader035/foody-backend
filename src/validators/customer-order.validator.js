import { z } from "zod";
import {
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
} from "../constants/domain.constants.js";

export const createCustomerOrderSchema = z.object({
  mealId: z.string().min(10),
  quantity: z.number().int().min(1).max(25),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  notes: z.string().max(500).optional(),
});

export const checkoutCustomerOrdersSchema = z.object({
  items: z
    .array(
      z.object({
        mealId: z.string().min(10),
        quantity: z.number().int().min(1).max(25),
        paymentMethod: z.enum(PAYMENT_METHODS).optional(),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(50),
});

export const updateCustomerOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS).optional(),
  paymentStatus: z.enum(PAYMENT_STATUS).optional(),
});
