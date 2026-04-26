import { Branch } from "../models/branch.model.js";
import { ApiError } from "../utils/apiResponse.js";

/**
 * Verifies that the given manager owns the specified branch and it is active.
 * Returns the branch document if valid.
 */
export async function ensureManagerOwnsBranch(managerId, branchId) {
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

/**
 * Verifies that the given staff actor is assigned to (or allowed to access)
 * the specified branch. Returns the branch document if valid.
 */
export async function ensureStaffCanAccessBranch(staffActor, branchId) {
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

/**
 * Convenience wrapper: routes to the correct branch-access check based on the actor's role.
 * Throws if the actor is not a manager or staff.
 */
export async function ensureActorCanAccessBranch(actor, branchId) {
  if (actor.role === "manager") {
    return ensureManagerOwnsBranch(actor._id, branchId);
  }

  if (actor.role === "staff") {
    return ensureStaffCanAccessBranch(actor, branchId);
  }

  throw new ApiError(403, "You do not have access to this branch");
}
