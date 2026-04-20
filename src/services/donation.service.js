import crypto from "crypto";
import mongoose from "mongoose";
import { Branch } from "../models/branch.model.js";
import { Donation } from "../models/donation.model.js";
import { SurplusMeal } from "../models/surplus-meal.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiResponse.js";
import { toPaginatedResult } from "../utils/list-query.js";
import { recordAuditEvent } from "./audit-log.service.js";

function ensureObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
}

function generatePickupCode() {
  return `PK-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function ensureManagerOwnsBranch(managerId, branchId) {
  const branch = await Branch.findOne({
    _id: branchId,
    managerId,
    isActive: true,
  });
  if (!branch) {
    throw new ApiError(404, "Branch not found or inactive");
  }
}

async function ensureStaffCanAccessBranch(staffActor, branchId) {
  if (staffActor.branchId && String(staffActor.branchId) !== String(branchId)) {
    throw new ApiError(403, "Staff can only access their assigned branch");
  }

  const query = {
    _id: branchId,
    isActive: true,
  };

  if (staffActor.managerId) {
    query.managerId = staffActor.managerId;
  }

  if (!staffActor.branchId && staffActor.branchName) {
    query.name = staffActor.branchName;
  }

  const branch = await Branch.findOne(query);
  if (!branch) {
    throw new ApiError(403, "Staff is not assigned to this branch");
  }
}

export async function createDonationMatch(actor, payload) {
  if (!["manager", "staff"].includes(actor.role)) {
    throw new ApiError(403, "Only manager or staff can create donations");
  }

  ensureObjectId(payload.mealId, "mealId");
  ensureObjectId(payload.charityId, "charityId");

  const meal = await SurplusMeal.findById(payload.mealId);
  if (!meal) {
    throw new ApiError(404, "Surplus meal not found");
  }

  if (!meal.visibility.allowDonation) {
    throw new ApiError(400, "This meal is not available for donation");
  }

  if (meal.quantityAvailable < payload.quantity) {
    throw new ApiError(400, "Requested donation quantity exceeds availability");
  }

  if (actor.role === "manager") {
    await ensureManagerOwnsBranch(actor._id, meal.branchId);
  } else {
    await ensureStaffCanAccessBranch(actor, meal.branchId);
  }

  const charity = await User.findOne({
    _id: payload.charityId,
    role: "charity",
  });
  if (!charity) {
    throw new ApiError(404, "Charity account not found");
  }

  const updatedMeal = await SurplusMeal.findOneAndUpdate(
    {
      _id: meal._id,
      quantityAvailable: { $gte: payload.quantity },
      "visibility.allowDonation": true,
      status: { $in: ["available", "reserved"] },
    },
    {
      $inc: { quantityAvailable: -payload.quantity },
    },
    { returnDocument: "after" },
  );

  if (!updatedMeal) {
    throw new ApiError(409, "Meal stock changed, please retry donation");
  }

  const donation = await Donation.create({
    mealId: meal._id,
    branchId: meal.branchId,
    charityId: payload.charityId,
    matchedBy: actor._id,
    pickupCode: generatePickupCode(),
    quantity: payload.quantity,
    scheduledPickupAt: payload.scheduledPickupAt
      ? new Date(payload.scheduledPickupAt)
      : null,
    notes: payload.notes,
  });

  if (updatedMeal.quantityAvailable === 0) {
    updatedMeal.status = "donated";
    await updatedMeal.save();
  }

  await recordAuditEvent({
    actor,
    entityType: "donation",
    entityId: donation._id,
    branchId: donation.branchId,
    action: "donation.created",
    after: {
      status: donation.status,
      quantity: donation.quantity,
      mealId: donation.mealId,
      charityId: donation.charityId,
    },
    metadata: {
      mealQuantityAvailableAfterReservation: updatedMeal.quantityAvailable,
    },
  });

  return donation;
}

export async function listDonations(actor, filters = {}, options = {}) {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (actor.role === "charity") {
    query.charityId = actor._id;
  }

  if (actor.role === "manager") {
    const branches = await Branch.find({ managerId: actor._id }).select("_id");
    query.branchId = { $in: branches.map((b) => b._id) };
  }

  if (actor.role === "staff") {
    if (actor.branchId) {
      query.branchId = actor.branchId;
    } else if (actor.branchName) {
      const branchQuery = {
        name: actor.branchName,
        isActive: true,
      };

      if (actor.managerId) {
        branchQuery.managerId = actor.managerId;
      }

      const branch = await Branch.findOne(branchQuery).select("_id");
      query.branchId = branch ? branch._id : null;
    } else {
      query.branchId = null;
    }
  }

  if (!["charity", "manager", "staff"].includes(actor.role)) {
    throw new ApiError(403, "You are not allowed to view donations");
  }

  const sortField = options.sortBy || "createdAt";
  const sortDirection = options.sortDirection === "asc" ? 1 : -1;

  const [items, total] = await Promise.all([
    Donation.find(query)
      .sort({ [sortField]: sortDirection })
      .skip(options.skip || 0)
      .limit(options.limit || 10),
    Donation.countDocuments(query),
  ]);

  return toPaginatedResult(
    items,
    total,
    options.page || 1,
    options.limit || 10,
  );
}

export async function updateDonationStatus(actor, donationId, payload) {
  ensureObjectId(donationId, "donationId");

  const donation = await Donation.findById(donationId);
  if (!donation) {
    throw new ApiError(404, "Donation not found");
  }

  if (!["manager", "staff", "charity"].includes(actor.role)) {
    throw new ApiError(403, "You are not allowed to update donations");
  }

  if (
    actor.role === "charity" &&
    String(donation.charityId) !== String(actor._id)
  ) {
    throw new ApiError(403, "You can only update your donations");
  }

  if (actor.role === "manager") {
    await ensureManagerOwnsBranch(actor._id, donation.branchId);
  } else if (actor.role === "staff") {
    await ensureStaffCanAccessBranch(actor, donation.branchId);
  }

  const before = {
    status: donation.status,
    pickedUpAt: donation.pickedUpAt,
    completedAt: donation.completedAt,
    cancellationReason: donation.cancellationReason,
  };

  donation.status = payload.status;

  if (payload.status === "picked_up") {
    donation.pickedUpAt = new Date();
  }

  if (payload.status === "completed") {
    donation.completedAt = new Date();
  }

  if (payload.status === "cancelled") {
    donation.cancellationReason =
      payload.cancellationReason || donation.cancellationReason;

    const meal = await SurplusMeal.findById(donation.mealId);
    if (meal) {
      meal.quantityAvailable += donation.quantity;
      if (meal.status === "donated") {
        meal.status = "available";
      }
      await meal.save();
    }
  }

  await donation.save();

  await recordAuditEvent({
    actor,
    entityType: "donation",
    entityId: donation._id,
    branchId: donation.branchId,
    action: "donation.status_changed",
    before,
    after: {
      status: donation.status,
      pickedUpAt: donation.pickedUpAt,
      completedAt: donation.completedAt,
      cancellationReason: donation.cancellationReason,
    },
  });

  return donation;
}
