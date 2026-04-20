import mongoose from "mongoose";
import { Branch } from "../models/branch.model.js";
import { ApiError } from "../utils/apiResponse.js";
import { toPaginatedResult } from "../utils/list-query.js";

function ensureObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
}

export async function createBranchForManager(managerId, payload) {
  const branch = await Branch.create({
    ...payload,
    managerId,
    location: payload.location?.coordinates
      ? { type: "Point", coordinates: payload.location.coordinates }
      : undefined,
  });

  return branch;
}

export async function listBranchesForActor(actor, options = {}) {
  const query = {};

  if (actor.role === "manager") {
    query.managerId = actor._id;

    if (!options.includeInactive) {
      query.isActive = true;
    }
  } else {
    query.isActive = true;

    if (actor.role === "staff") {
      if (actor.branchId) {
        query._id = actor.branchId;
      } else if (actor.branchName) {
        query.name = actor.branchName;
      } else {
        query._id = null;
      }

      if (actor.managerId) {
        query.managerId = actor.managerId;
      }
    }
  }

  const sortField = options.sortBy || "createdAt";
  const sortDirection = options.sortDirection === "asc" ? 1 : -1;

  const [items, total] = await Promise.all([
    Branch.find(query)
      .sort({ [sortField]: sortDirection })
      .skip(options.skip || 0)
      .limit(options.limit || 10),
    Branch.countDocuments(query),
  ]);

  return toPaginatedResult(
    items,
    total,
    options.page || 1,
    options.limit || 10,
  );
}

export async function getBranchByIdForManager(managerId, branchId) {
  ensureObjectId(branchId, "branchId");

  const branch = await Branch.findOne({ _id: branchId, managerId });
  if (!branch) {
    throw new ApiError(404, "Branch not found");
  }

  return branch;
}

export async function updateBranchForManager(managerId, branchId, payload) {
  ensureObjectId(branchId, "branchId");

  const updatePayload = { ...payload };

  if (payload.location?.coordinates) {
    updatePayload.location = {
      type: "Point",
      coordinates: payload.location.coordinates,
    };
  }

  const branch = await Branch.findOneAndUpdate(
    { _id: branchId, managerId },
    updatePayload,
    { returnDocument: "after", runValidators: true },
  );

  if (!branch) {
    throw new ApiError(404, "Branch not found");
  }

  return branch;
}
