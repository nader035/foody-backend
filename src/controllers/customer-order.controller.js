import { ApiError, ApiResponse } from "../utils/apiResponse.js";
import { zodErrorsToMap } from "../utils/validation.helpers.js";
import {
  checkoutCustomerOrders,
  createCustomerOrder,
  listOrders,
  updateCustomerOrderStatus,
} from "../services/customer-order.service.js";
import {
  checkoutCustomerOrdersSchema,
  createCustomerOrderSchema,
  updateCustomerOrderStatusSchema,
} from "../validators/customer-order.validator.js";
import { parsePaginationQuery } from "../utils/list-query.js";



export async function createOrder(req, res, next) {
  try {
    const parsed = createCustomerOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const order = await createCustomerOrder(req.user, parsed.data);
    return res.status(201).json(new ApiResponse(201, "Order created", order));
  } catch (error) {
    return next(error);
  }
}

export async function checkoutOrders(req, res, next) {
  try {
    const parsed = checkoutCustomerOrdersSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const result = await checkoutCustomerOrders(req.user, parsed.data);
    return res
      .status(200)
      .json(new ApiResponse(200, "Checkout processed", result));
  } catch (error) {
    return next(error);
  }
}

export async function listMyOrders(req, res, next) {
  try {
    const pagination = parsePaginationQuery(req.query);
    const orders = await listOrders(
      req.user,
      {
        status: req.query.status,
        paymentStatus: req.query.paymentStatus,
      },
      {
        ...pagination,
        sortBy: req.query.sortBy,
        sortDirection: req.query.sortDirection,
      },
    );
    return res.status(200).json(new ApiResponse(200, "Orders fetched", orders));
  } catch (error) {
    return next(error);
  }
}

export async function changeOrderStatus(req, res, next) {
  try {
    const parsed = updateCustomerOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const order = await updateCustomerOrderStatus(
      req.user,
      req.params.orderId,
      parsed.data,
    );
    return res
      .status(200)
      .json(new ApiResponse(200, "Order status updated", order));
  } catch (error) {
    return next(error);
  }
}
