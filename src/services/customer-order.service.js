import mongoose from "mongoose";
import { Branch } from "../models/branch.model.js";
import { CustomerOrder } from "../models/customer-order.model.js";
import { SurplusMeal } from "../models/surplus-meal.model.js";
import { ApiError } from "../utils/apiResponse.js";
import { toPaginatedResult } from "../utils/list-query.js";
import { recordAuditEvent } from "./audit-log.service.js";

function ensureObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
}

export async function createCustomerOrder(actor, payload) {
  if (actor.role !== "customer") {
    throw new ApiError(403, "Only customers can create orders");
  }

  ensureObjectId(payload.mealId, "mealId");

  const meal = await SurplusMeal.findById(payload.mealId);
  if (!meal) {
    throw new ApiError(404, "Surplus meal not found");
  }

  if (!meal.visibility.allowMarketplace) {
    throw new ApiError(400, "Meal is not available for marketplace purchase");
  }

  if (meal.status !== "available") {
    throw new ApiError(400, "Meal is not currently available");
  }

  if (meal.expiresAt < new Date()) {
    throw new ApiError(400, "Meal has expired");
  }

  if (meal.quantityAvailable < payload.quantity) {
    throw new ApiError(400, "Not enough quantity available");
  }

  const pickupWindowStart = new Date();
  const pickupWindowEnd = meal.expiresAt;

  const updatedMeal = await SurplusMeal.findOneAndUpdate(
    {
      _id: meal._id,
      quantityAvailable: { $gte: payload.quantity },
      status: "available",
      "visibility.allowMarketplace": true,
      expiresAt: { $gt: new Date() },
    },
    {
      $inc: { quantityAvailable: -payload.quantity },
    },
    { returnDocument: "after" },
  );

  if (!updatedMeal) {
    throw new ApiError(409, "Meal stock changed, please retry order");
  }

  const order = await CustomerOrder.create({
    mealId: meal._id,
    branchId: meal.branchId,
    customerId: actor._id,
    quantity: payload.quantity,
    unitPrice: meal.unitPrice,
    totalPrice: meal.unitPrice * payload.quantity,
    paymentMethod: payload.paymentMethod || "cash",
    paymentStatus: "unpaid",
    status: "pending_payment",
    pickupWindowStart,
    pickupWindowEnd,
    notes: payload.notes,
  });

  if (updatedMeal.quantityAvailable === 0) {
    updatedMeal.status = "reserved";
    await updatedMeal.save();
  }

  await recordAuditEvent({
    actor,
    entityType: "customer_order",
    entityId: order._id,
    branchId: order.branchId,
    action: "order.created",
    after: {
      status: order.status,
      paymentStatus: order.paymentStatus,
      quantity: order.quantity,
      totalPrice: order.totalPrice,
    },
    metadata: {
      mealId: order.mealId,
      mealQuantityAvailableAfterReservation: updatedMeal.quantityAvailable,
    },
  });

  return order;
}

export async function checkoutCustomerOrders(actor, payload) {
  if (actor.role !== "customer") {
    throw new ApiError(403, "Only customers can checkout cart orders");
  }

  const consolidatedByMeal = new Map();
  payload.items.forEach((item) => {
    const existing = consolidatedByMeal.get(item.mealId);
    if (existing) {
      existing.quantity += item.quantity;
      if (!existing.paymentMethod && item.paymentMethod) {
        existing.paymentMethod = item.paymentMethod;
      }
      if (!existing.notes && item.notes) {
        existing.notes = item.notes;
      }
      return;
    }

    consolidatedByMeal.set(item.mealId, { ...item });
  });

  const consolidatedItems = Array.from(consolidatedByMeal.values());

  const settled = await Promise.allSettled(
    consolidatedItems.map((item) => createCustomerOrder(actor, item)),
  );

  const succeeded = [];
  const failed = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      succeeded.push(result.value);
      return;
    }

    const reason = result.reason;
    failed.push({
      mealId: consolidatedItems[index].mealId,
      quantity: consolidatedItems[index].quantity,
      message:
        reason instanceof ApiError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Checkout item failed",
    });
  });

  const successfulItems = succeeded.length;
  const failedItems = failed.length;
  const totalMealsReserved = succeeded.reduce(
    (sum, order) => sum + order.quantity,
    0,
  );

  return {
    successfulItems,
    failedItems,
    totalMealsReserved,
    orders: succeeded,
    failures: failed,
  };
}

export async function listOrders(actor, filters = {}, options = {}) {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }

  if (actor.role === "customer") {
    query.customerId = actor._id;
  }

  if (actor.role === "manager") {
    const branches = await Branch.find({ managerId: actor._id }).select("_id");
    query.branchId = { $in: branches.map((b) => b._id) };
  }

  if (!["customer", "manager"].includes(actor.role)) {
    throw new ApiError(403, "You are not allowed to view orders");
  }

  const sortField = options.sortBy || "createdAt";
  const sortDirection = options.sortDirection === "asc" ? 1 : -1;

  const [items, total] = await Promise.all([
    CustomerOrder.find(query)
      .sort({ [sortField]: sortDirection })
      .skip(options.skip || 0)
      .limit(options.limit || 10),
    CustomerOrder.countDocuments(query),
  ]);

  return toPaginatedResult(
    items,
    total,
    options.page || 1,
    options.limit || 10,
  );
}

export async function updateCustomerOrderStatus(actor, orderId, payload) {
  ensureObjectId(orderId, "orderId");

  const order = await CustomerOrder.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!["customer", "manager"].includes(actor.role)) {
    throw new ApiError(403, "You are not allowed to update this order");
  }

  if (
    actor.role === "customer" &&
    String(order.customerId) !== String(actor._id)
  ) {
    throw new ApiError(403, "You can only update your own orders");
  }

  if (actor.role === "manager") {
    const branch = await Branch.findOne({
      _id: order.branchId,
      managerId: actor._id,
    });
    if (!branch) {
      throw new ApiError(403, "Order does not belong to your branches");
    }
  }

  const previousStatus = order.status;
  const before = {
    status: order.status,
    paymentStatus: order.paymentStatus,
    pickedUpAt: order.pickedUpAt,
    cancelledAt: order.cancelledAt,
  };

  if (payload.status) {
    order.status = payload.status;
  }

  if (payload.paymentStatus) {
    order.paymentStatus = payload.paymentStatus;
  }

  if (order.status === "completed" && !order.pickedUpAt) {
    order.pickedUpAt = new Date();
  }

  if (order.status === "cancelled" && !order.cancelledAt) {
    order.cancelledAt = new Date();

    if (!["cancelled", "completed", "refunded"].includes(previousStatus)) {
      const meal = await SurplusMeal.findById(order.mealId);
      if (meal) {
        meal.quantityAvailable += order.quantity;
        if (["reserved", "sold"].includes(meal.status)) {
          meal.status = "available";
        }
        await meal.save();
      }
    }
  }

  await order.save();

  await recordAuditEvent({
    actor,
    entityType: "customer_order",
    entityId: order._id,
    branchId: order.branchId,
    action: "order.status_changed",
    before,
    after: {
      status: order.status,
      paymentStatus: order.paymentStatus,
      pickedUpAt: order.pickedUpAt,
      cancelledAt: order.cancelledAt,
    },
  });

  return order;
}
