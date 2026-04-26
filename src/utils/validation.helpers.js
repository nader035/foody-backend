import mongoose from "mongoose";
import { ApiError } from "./apiResponse.js";

/**
 * Converts Zod validation issues into a flat array of { path, message } objects
 * suitable for the API error envelope.
 */
export function zodErrorsToMap(issues) {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Throws a 400 ApiError when the given value is not a valid MongoDB ObjectId.
 */
export function ensureObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
}
