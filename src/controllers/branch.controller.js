import { ApiError, ApiResponse } from "../utils/apiResponse.js";
import {
  createBranchForManager,
  getBranchByIdForManager,
  listBranchesForActor,
  updateBranchForManager,
} from "../services/branch.service.js";
import {
  createBranchSchema,
  updateBranchSchema,
} from "../validators/branch.validator.js";
import { parsePaginationQuery } from "../utils/list-query.js";

function zodErrorsToMap(issues) {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export async function createBranch(req, res, next) {
  try {
    const parsed = createBranchSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const branch = await createBranchForManager(req.user._id, parsed.data);
    return res.status(201).json(new ApiResponse(201, "Branch created", branch));
  } catch (error) {
    return next(error);
  }
}

export async function listMyBranches(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const pagination = parsePaginationQuery(req.query);
    const branches = await listBranchesForActor(req.user, {
      includeInactive,
      ...pagination,
      sortBy: req.query.sortBy,
      sortDirection: req.query.sortDirection,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, "Branches fetched", branches));
  } catch (error) {
    return next(error);
  }
}

export async function getMyBranchById(req, res, next) {
  try {
    const branch = await getBranchByIdForManager(
      req.user._id,
      req.params.branchId,
    );
    return res.status(200).json(new ApiResponse(200, "Branch fetched", branch));
  } catch (error) {
    return next(error);
  }
}

export async function updateMyBranch(req, res, next) {
  try {
    const parsed = updateBranchSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const branch = await updateBranchForManager(
      req.user._id,
      req.params.branchId,
      parsed.data,
    );
    return res.status(200).json(new ApiResponse(200, "Branch updated", branch));
  } catch (error) {
    return next(error);
  }
}
