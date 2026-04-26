import { z } from "zod";

const roles = ["customer", "manager", "staff", "charity"];

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number");

export const registerSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    email: z.email(),
    password: passwordSchema,
    role: z.enum(roles).default("customer"),
    phone: z.string().min(6).max(30).optional(),
    restaurantName: z.string().min(2).max(120).optional(),
    branchName: z.string().min(2).max(120).optional(),
    organizationName: z.string().min(2).max(120).optional(),
    organizationAddress: z.string().min(4).max(250).optional(),
    organizationWebsite: z.url().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "manager" && !data.restaurantName) {
      ctx.addIssue({
        path: ["restaurantName"],
        code: "custom",
        message: "restaurantName is required for manager role",
      });
    }

    if (data.role === "charity" && !data.organizationName) {
      ctx.addIssue({
        path: ["organizationName"],
        code: "custom",
        message: "organizationName is required for charity role",
      });
    }

    if (data.role === "charity" && !data.organizationAddress) {
      ctx.addIssue({
        path: ["organizationAddress"],
        code: "custom",
        message: "organizationAddress is required for charity role",
      });
    }

    if (data.role === "staff") {
      ctx.addIssue({
        path: ["role"],
        code: "custom",
        message: "Staff accounts must be created internally by manager",
      });
    }
  });

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
  role: z.enum(roles).optional(),
});

export const createStaffSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.email(),
  password: passwordSchema,
  phone: z.string().min(6).max(30).optional(),
  branchId: z.string().min(10),
  branchName: z.string().min(2).max(120).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Reset token is required"),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(6).max(30).optional(),
  restaurantName: z.string().min(2).max(120).optional(),
  branchName: z.string().min(2).max(120).optional(),
  organizationName: z.string().min(2).max(120).optional(),
  organizationAddress: z.string().min(4).max(250).optional(),
  organizationWebsite: z.url().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const updateStaffStatusSchema = z.object({
  isActive: z.boolean(),
});
