import { ApiError, ApiResponse } from "../utils/apiResponse.js";

export function notFoundHandler(req, res) {
  res
    .status(404)
    .json(new ApiResponse(404, `Route not found: ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  console.error(err);

  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: "Internal server error",
  });
}
