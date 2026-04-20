import { ApiResponse, ApiError } from "../utils/apiResponse.js";
import {
  changeUserPassword,
  getUserProfile,
  listUsersByRole,
  loginUser,
  requestPasswordReset,
  registerUser,
  resetPassword,
  updateUserProfile,
  createStaffAccount,
  updateStaffStatusByManager,
  listCharities,
} from "../services/user.service.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  createStaffSchema,
  updateStaffStatusSchema,
} from "../validators/user.validator.js";

function zodErrorsToMap(issues) {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const result = await registerUser(parsed.data);
    return res
      .status(201)
      .json(new ApiResponse(201, "User registered successfully", result));
  } catch (error) {
    return next(error);
  }
}

export async function createStaff(req, res, next) {
  try {
    const parsed = createStaffSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const result = await createStaffAccount(req.user, parsed.data);
    return res
      .status(201)
      .json(new ApiResponse(201, "Staff account created successfully", result));
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const result = await loginUser(parsed.data);
    return res
      .status(200)
      .json(new ApiResponse(200, "Login successful", result));
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await getUserProfile(req.user._id);
    return res.status(200).json(new ApiResponse(200, "Profile fetched", user));
  } catch (error) {
    return next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const role = req.query.role;
    const users = await listUsersByRole(req.user, role);
    return res.status(200).json(new ApiResponse(200, "Users fetched", users));
  } catch (error) {
    return next(error);
  }
}

export async function listAccessibleCharities(req, res, next) {
  try {
    const charities = await listCharities(req.user);
    return res
      .status(200)
      .json(new ApiResponse(200, "Charities fetched", charities));
  } catch (error) {
    return next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const result = await requestPasswordReset(parsed.data.email);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "If the email exists, a reset link has been generated",
          result,
        ),
      );
  } catch (error) {
    return next(error);
  }
}

export async function confirmResetPassword(req, res, next) {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const result = await resetPassword(parsed.data.token, parsed.data.password);

    return res
      .status(200)
      .json(new ApiResponse(200, "Password reset successful", result));
  } catch (error) {
    return next(error);
  }
}

export async function updateMe(req, res, next) {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const user = await updateUserProfile(req.user._id, parsed.data);
    return res.status(200).json(new ApiResponse(200, "Profile updated", user));
  } catch (error) {
    return next(error);
  }
}

export async function changeMyPassword(req, res, next) {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const result = await changeUserPassword(
      req.user._id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );

    return res
      .status(200)
      .json(new ApiResponse(200, "Password changed successfully", result));
  } catch (error) {
    return next(error);
  }
}

export async function updateStaffStatus(req, res, next) {
  try {
    const parsed = updateStaffStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const user = await updateStaffStatusByManager(
      req.user._id,
      req.params.userId,
      parsed.data,
    );
    return res
      .status(200)
      .json(new ApiResponse(200, "Staff status updated", user));
  } catch (error) {
    return next(error);
  }
}
