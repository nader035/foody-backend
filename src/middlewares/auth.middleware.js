import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";

function extractBearerToken(authHeader = "") {
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function resolveAuthenticatedUser(token) {
  const payload = jwt.verify(token, env.jwtSecret);
  const user = await User.findById(payload.sub).select("-password");

  if (!user) {
    throw new ApiError(401, "Invalid token user");
  }

  if (user.isActive === false) {
    throw new ApiError(403, "Account is inactive");
  }

  return user;
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization || "");

    if (!token) {
      throw new ApiError(401, "Authorization token is required");
    }

    req.user = await resolveAuthenticatedUser(token);
    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return next(new ApiError(401, "Invalid or expired token"));
    }
    return next(error);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization || "");
    if (!token) {
      return next();
    }

    req.user = await resolveAuthenticatedUser(token);
    return next();
  } catch {
    // For optional auth, silently proceed as unauthenticated guest.
    // Invalid or expired tokens should not block public endpoints.
    return next();
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ApiError(403, "You do not have permission to access this resource"),
      );
    }
    return next();
  };
}
