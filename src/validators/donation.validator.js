import { z } from "zod";
import { DONATION_STATUS } from "../constants/domain.constants.js";

export const createDonationSchema = z.object({
  mealId: z.string().min(10),
  charityId: z.string().min(10),
  quantity: z.number().int().min(1),
  scheduledPickupAt: z.iso.datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const updateDonationStatusSchema = z.object({
  status: z.enum(DONATION_STATUS),
  cancellationReason: z.string().max(300).optional(),
});
