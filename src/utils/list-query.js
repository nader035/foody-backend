import { ApiError } from "./apiResponse.js";

export function parsePaginationQuery(query) {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);

  if (!Number.isFinite(page) || page < 1) {
    throw new ApiError(400, "page must be a positive number");
  }

  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    throw new ApiError(400, "limit must be between 1 and 100");
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function toPaginatedResult(items, total, page, limit) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}
