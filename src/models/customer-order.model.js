import crypto from "crypto";
import mongoose from "mongoose";
import {
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
} from "../constants/domain.constants.js";

const customerOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
      maxlength: 40,
    },
    mealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SurplusMeal",
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "EGP",
      uppercase: true,
      trim: true,
      maxlength: 6,
    },
    status: {
      type: String,
      enum: ORDER_STATUS,
      default: "pending_payment",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "cash",
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS,
      default: "unpaid",
      index: true,
    },
    pickupWindowStart: {
      type: Date,
      required: true,
    },
    pickupWindowEnd: {
      type: Date,
      required: true,
    },
    pickedUpAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

customerOrderSchema.pre("validate", function ensureCalculatedFields() {
  if (!this.orderNumber) {
    const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
    this.orderNumber = `ORD-${Date.now()}-${suffix}`;
  }

  this.totalPrice = Number((this.quantity * this.unitPrice).toFixed(2));

  if (this.pickupWindowEnd < this.pickupWindowStart) {
    this.invalidate(
      "pickupWindowEnd",
      "pickupWindowEnd must be greater than or equal to pickupWindowStart",
    );
  }
});

customerOrderSchema.index({ customerId: 1, status: 1, createdAt: -1 });
customerOrderSchema.index({ branchId: 1, status: 1, createdAt: -1 });

export const CustomerOrder = mongoose.model(
  "CustomerOrder",
  customerOrderSchema,
);
