import mongoose from "mongoose";
import { Branch } from "../models/branch.model.js";
import { AuditLog } from "../models/audit-log.model.js";
import { ApiError } from "../utils/apiResponse.js";
import { toPaginatedResult } from "../utils/list-query.js";

function normalizeObjectId(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return null;
    }
    return new mongoose.Types.ObjectId(value);
  }

  return value;
}

export async function recordAuditEvent({
  actor,
  entityType,
  entityId,
  branchId = null,
  action,
  before = null,
  after = null,
  metadata = {},
}) {
  return AuditLog.create({
    actorId: actor._id,
    actorRole: actor.role,
    entityType,
    entityId: normalizeObjectId(entityId),
    branchId: normalizeObjectId(branchId),
    action,
    before,
    after,
    metadata,
  });
}

export async function listAuditEvents(actor, filters = {}, options = {}) {
  const query = {};

  if (filters.entityType) {
    query.entityType = filters.entityType;
  }

  if (filters.action) {
    query.action = filters.action;
  }

  if (filters.branchId) {
    query.branchId = normalizeObjectId(filters.branchId);
  }

  if (filters.entityId) {
    query.entityId = normalizeObjectId(filters.entityId);
  }

  if (actor.role === "manager") {
    const branches = await Branch.find({ managerId: actor._id }).select("_id");
    const branchIds = branches.map((branch) => branch._id);

    if (query.branchId) {
      const requested = String(query.branchId);
      if (!branchIds.some((branchId) => String(branchId) === requested)) {
        throw new ApiError(403, "Requested branch is not accessible");
      }
    } else {
      query.branchId = { $in: branchIds };
    }
  } else if (actor.role === "staff") {
    query.actorId = actor._id;
  } else {
    throw new ApiError(403, "You are not allowed to view audit logs");
  }

  const sortField = options.sortBy || "createdAt";
  const sortDirection = options.sortDirection === "asc" ? 1 : -1;

  const [items, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ [sortField]: sortDirection })
      .skip(options.skip || 0)
      .limit(options.limit || 10),
    AuditLog.countDocuments(query),
  ]);

  return toPaginatedResult(
    items,
    total,
    options.page || 1,
    options.limit || 10,
  );
}
