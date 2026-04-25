import mongoose from "mongoose";
import { Branch } from "../models/branch.model.js";
import { SurplusMeal } from "../models/surplus-meal.model.js";
import { ApiError } from "../utils/apiResponse.js";
import { toPaginatedResult } from "../utils/list-query.js";
import { recordAuditEvent } from "./audit-log.service.js";

function ensureObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
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
  return branch;
}

async function ensureStaffCanAccessBranch(staffActor, branchId) {
  const requestedBranchId = String(branchId);

  if (
    staffActor.branchId &&
    String(staffActor.branchId) !== requestedBranchId
  ) {
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

  return branch;
}

export async function createSurplusMeal(actor, payload) {
  if (!["manager", "staff"].includes(actor.role)) {
    throw new ApiError(403, "Only manager or staff can create surplus meals");
  }

  ensureObjectId(payload.branchId, "branchId");

  if (actor.role === "manager") {
    await ensureManagerOwnsBranch(actor._id, payload.branchId);
  } else {
    await ensureStaffCanAccessBranch(actor, payload.branchId);
  }

  const quantityAvailable = payload.quantityAvailable ?? payload.quantityTotal;
  const expiresAtDate = new Date(payload.expiresAt);

  if (expiresAtDate <= new Date()) {
    throw new ApiError(400, "Expiration time must be in the future");
  }

  const meal = await SurplusMeal.create({
    ...payload,
    quantityAvailable,
    createdBy: actor._id,
    expiresAt: expiresAtDate,
  });

  await recordAuditEvent({
    actor,
    entityType: "surplus_meal",
    entityId: meal._id,
    branchId: meal.branchId,
    action: "meal.created",
    after: {
      status: meal.status,
      quantityTotal: meal.quantityTotal,
      quantityAvailable: meal.quantityAvailable,
      expiresAt: meal.expiresAt,
    },
  });

  return meal;
}

export async function listSurplusMeals(actor, filters = {}, options = {}) {
  const query = {};

  if (filters.branchId) {
    ensureObjectId(filters.branchId, "branchId");
    query.branchId = filters.branchId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (actor?.role === "manager") {
    const branches = await Branch.find({ managerId: actor._id }).select("_id");
    query.branchId = { $in: branches.map((b) => b._id) };
  }

  if (actor?.role === "staff") {
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

  if (!actor || !["manager", "staff"].includes(actor.role)) {
    query.status = "available";
    query["visibility.allowMarketplace"] = true;
    query.quantityAvailable = { $gt: 0 };
    query.expiresAt = { $gt: new Date() };
  }

  const sortField = options.sortBy || "createdAt";
  const sortDirection = options.sortDirection === "asc" ? 1 : -1;

  const [items, total] = await Promise.all([
    SurplusMeal.find(query)
      .populate("branchId", "name")
      .sort({ [sortField]: sortDirection })
      .skip(options.skip || 0)
      .limit(options.limit || 10),
    SurplusMeal.countDocuments(query),
  ]);

  return toPaginatedResult(
    items,
    total,
    options.page || 1,
    options.limit || 10,
  );
}

export async function getSurplusMealById(actor, mealId) {
  ensureObjectId(mealId, "mealId");

  const meal = await SurplusMeal.findById(mealId).populate(
    "branchId",
    "name address contactPhone",
  );
  if (!meal) {
    throw new ApiError(404, "Surplus meal not found");
  }

  if (actor?.role === "manager") {
    await ensureManagerOwnsBranch(
      actor._id,
      meal.branchId._id || meal.branchId,
    );
  } else if (actor?.role === "staff") {
    await ensureStaffCanAccessBranch(actor, meal.branchId._id || meal.branchId);
  }

  if (!actor || !["manager", "staff"].includes(actor.role)) {
    if (
      meal.status !== "available" ||
      !meal.visibility.allowMarketplace ||
      meal.expiresAt < new Date()
    ) {
      throw new ApiError(404, "Meal not available");
    }
  }

  return meal;
}

export async function updateSurplusMeal(actor, mealId, payload) {
  ensureObjectId(mealId, "mealId");

  const meal = await SurplusMeal.findById(mealId);
  if (!meal) {
    throw new ApiError(404, "Surplus meal not found");
  }

  if (actor.role === "manager") {
    await ensureManagerOwnsBranch(actor._id, meal.branchId);
  } else if (actor.role === "staff") {
    await ensureStaffCanAccessBranch(actor, meal.branchId);
  } else {
    throw new ApiError(403, "You are not allowed to update meals");
  }

  const before = {
    status: meal.status,
    quantityTotal: meal.quantityTotal,
    quantityAvailable: meal.quantityAvailable,
    expiresAt: meal.expiresAt,
  };

  Object.assign(meal, payload);

  if (payload.expiresAt) {
    const expiresAtDate = new Date(payload.expiresAt);
    if (expiresAtDate <= new Date()) {
      throw new ApiError(400, "Expiration time must be in the future");
    }
    meal.expiresAt = expiresAtDate;
  }

  await meal.save();

  const isStatusChange = payload.status && payload.status !== before.status;
  await recordAuditEvent({
    actor,
    entityType: "surplus_meal",
    entityId: meal._id,
    branchId: meal.branchId,
    action: isStatusChange ? "meal.status_changed" : "meal.updated",
    before,
    after: {
      status: meal.status,
      quantityTotal: meal.quantityTotal,
      quantityAvailable: meal.quantityAvailable,
      expiresAt: meal.expiresAt,
    },
    metadata: {
      changedFields: Object.keys(payload),
    },
  });

  return meal;
}

export async function updateSurplusMealStatus(actor, mealId, status) {
  return updateSurplusMeal(actor, mealId, { status });
}
