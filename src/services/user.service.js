import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Branch } from "../models/branch.model.js";
import { PasswordResetToken } from "../models/password-reset-token.model.js";
import { ApiError } from "../utils/apiResponse.js";
import { ensureObjectId } from "../utils/validation.helpers.js";
import { env } from "../config/env.js";

function buildToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function sanitizeUser(userDoc) {
  const user = userDoc.toObject();
  delete user.password;
  return user;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}



async function ensureManagerCanAssignBranch(managerId, branchId) {
  ensureObjectId(branchId, "branchId");

  const branch = await Branch.findOne({
    _id: branchId,
    managerId,
    isActive: true,
  });

  if (!branch) {
    throw new ApiError(
      404,
      "Branch not found, inactive, or not owned by manager",
    );
  }

  return branch;
}

export async function registerUser(payload) {
  const existing = await User.findOne({ email: payload.email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "Email already exists");
  }

  const user = await User.create({
    ...payload,
    email: payload.email.toLowerCase(),
  });

  const token = buildToken(user._id.toString());

  return {
    token,
    user: sanitizeUser(user),
  };
}

export async function createStaffAccount(managerActor, payload) {
  if (managerActor.role !== "manager") {
    throw new ApiError(403, "Only managers can create staff accounts");
  }

  const existing = await User.findOne({ email: payload.email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "Email already exists");
  }

  const branch = await ensureManagerCanAssignBranch(
    managerActor._id,
    payload.branchId,
  );

  const user = await User.create({
    ...payload,
    email: payload.email.toLowerCase(),
    role: "staff",
    managerId: managerActor._id,
    branchId: branch._id,
    branchName: branch.name,
    restaurantName: managerActor.restaurantName || null,
  });

  return sanitizeUser(user);
}

export async function loginUser(payload) {
  const user = await User.findOne({
    email: payload.email.toLowerCase(),
  }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.isActive === false) {
    throw new ApiError(403, "Account is inactive");
  }

  const isValidPassword = await user.comparePassword(payload.password);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = buildToken(user._id.toString());

  return {
    token,
    user: sanitizeUser(user),
  };
}

export async function getUserProfile(userId) {
  const user = await User.findById(userId).select("-password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}

export async function listUsersByRole(actor, role) {
  if (actor.role !== "manager") {
    throw new ApiError(403, "Only managers can list users");
  }

  if (!role || role === "staff") {
    return User.find({ role: "staff", managerId: actor._id })
      .select("-password")
      .sort({ createdAt: -1 });
  }

  if (role === "charity") {
    return User.find({ role: "charity", isActive: true })
      .select("-password")
      .sort({ createdAt: -1 });
  }

  throw new ApiError(400, "Unsupported role filter");
}

export async function listCharities(actor) {
  if (!actor || !["manager", "staff"].includes(actor.role)) {
    throw new ApiError(403, "Only managers or staff can list charities");
  }

  return User.find({ role: "charity", isActive: true })
    .select("-password")
    .sort({ createdAt: -1 });
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return {
      accepted: true,
      resetToken: null,
    };
  }

  await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
  });

  return {
    accepted: true,
    resetToken: rawToken, // TODO: Replace with actual email service in production
  };
}

export async function resetPassword(token, newPassword) {
  const tokenHash = hashToken(token);
  const resetRecord = await PasswordResetToken.findOne({
    tokenHash,
    usedAt: null,
  });

  if (!resetRecord || resetRecord.expiresAt < new Date()) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const user = await User.findById(resetRecord.userId).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = newPassword;
  await user.save();

  resetRecord.usedAt = new Date();
  await resetRecord.save();

  const newToken = buildToken(user._id.toString());

  return {
    token: newToken,
    user: sanitizeUser(user),
  };
}

export async function updateUserProfile(userId, patchData) {
  const allowedFields = [
    "fullName",
    "phone",
    "restaurantName",
    "organizationName",
    "organizationAddress",
    "organizationWebsite",
  ];

  const updatePayload = Object.fromEntries(
    Object.entries(patchData).filter(
      ([field, value]) => allowedFields.includes(field) && value !== undefined,
    ),
  );

  const user = await User.findByIdAndUpdate(userId, updatePayload, {
    returnDocument: "after",
    runValidators: true,
  }).select("-password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isValidCurrentPassword = await user.comparePassword(currentPassword);
  if (!isValidCurrentPassword) {
    throw new ApiError(400, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });

  return {
    token: buildToken(user._id.toString()),
    user: sanitizeUser(user),
  };
}

export async function updateStaffStatusByManager(managerId, userId, payload) {
  const user = await User.findOne({
    _id: userId,
    role: "staff",
    managerId,
  });

  if (!user) {
    throw new ApiError(404, "Staff user not found for this manager");
  }

  user.isActive = payload.isActive;
  await user.save();

  return sanitizeUser(user);
}
