import { z } from "zod";

const coordinatesSchema = z.array(z.number()).length(2).optional();

export const createBranchSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(24).optional(),
  address: z
    .object({
      line1: z.string().min(2).max(200).optional(),
      city: z.string().min(2).max(120).optional(),
      area: z.string().min(2).max(120).optional(),
      country: z.string().min(2).max(120).optional(),
    })
    .optional(),
  location: z
    .object({
      coordinates: coordinatesSchema,
    })
    .optional(),
  contactPhone: z.string().min(6).max(30).optional(),
  settings: z
    .object({
      autoAssignToCharity: z.boolean().optional(),
      publicListingEnabled: z.boolean().optional(),
      donationSplitPercentage: z.number().min(0).max(100).optional(),
      discountPercentage: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

export const updateBranchSchema = createBranchSchema.partial().extend({
  isActive: z.boolean().optional(),
});
