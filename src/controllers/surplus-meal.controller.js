import { ApiError, ApiResponse } from "../utils/apiResponse.js";
import { zodErrorsToMap } from "../utils/validation.helpers.js";
import {
  createSurplusMeal,
  getSurplusMealById,
  listSurplusMeals,
  updateSurplusMeal,
  updateSurplusMealStatus,
} from "../services/surplus-meal.service.js";
import {
  createSurplusMealSchema,
  updateSurplusMealSchema,
  updateSurplusMealStatusSchema,
} from "../validators/surplus-meal.validator.js";
import { parsePaginationQuery } from "../utils/list-query.js";



export async function createMeal(req, res, next) {
  try {
    const parsed = createSurplusMealSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const meal = await createSurplusMeal(req.user, parsed.data);
    return res
      .status(201)
      .json(new ApiResponse(201, "Surplus meal created", meal));
  } catch (error) {
    return next(error);
  }
}

export async function listMeals(req, res, next) {
  try {
    const pagination = parsePaginationQuery(req.query);
    const meals = await listSurplusMeals(
      req.user || null,
      {
        branchId: req.query.branchId,
        status: req.query.status,
        category: req.query.category,
      },
      {
        ...pagination,
        sortBy: req.query.sortBy,
        sortDirection: req.query.sortDirection,
      },
    );

    return res
      .status(200)
      .json(new ApiResponse(200, "Surplus meals fetched", meals));
  } catch (error) {
    return next(error);
  }
}

export async function getMealById(req, res, next) {
  try {
    const meal = await getSurplusMealById(req.user || null, req.params.mealId);
    return res
      .status(200)
      .json(new ApiResponse(200, "Surplus meal fetched", meal));
  } catch (error) {
    return next(error);
  }
}

export async function updateMeal(req, res, next) {
  try {
    const parsed = updateSurplusMealSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const meal = await updateSurplusMeal(
      req.user,
      req.params.mealId,
      parsed.data,
    );
    return res
      .status(200)
      .json(new ApiResponse(200, "Surplus meal updated", meal));
  } catch (error) {
    return next(error);
  }
}

export async function changeMealStatus(req, res, next) {
  try {
    const parsed = updateSurplusMealStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const meal = await updateSurplusMealStatus(
      req.user,
      req.params.mealId,
      parsed.data.status,
    );
    return res
      .status(200)
      .json(new ApiResponse(200, "Surplus meal status updated", meal));
  } catch (error) {
    return next(error);
  }
}
