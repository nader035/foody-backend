import mongoose from "mongoose";
import {
  MEAL_CATEGORIES,
  SURPLUS_MEAL_STATUS,
} from "../constants/domain.constants.js";

const surplusMealSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 140,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 600,
      default: null,
    },
    category: {
      type: String,
      enum: MEAL_CATEGORIES,
      default: "other",
      index: true,
    },
    quantityTotal: {
      type: Number,
      required: true,
      min: 1,
    },
    quantityAvailable: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: "EGP",
      uppercase: true,
      trim: true,
      maxlength: 6,
    },
    visibility: {
      allowDonation: { type: Boolean, default: true },
      allowMarketplace: { type: Boolean, default: true },
    },
    status: {
      type: String,
      enum: SURPLUS_MEAL_STATUS,
      default: "available",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    allergens: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

surplusMealSchema.pre("validate", function normalizeQuantities() {
  if (this.quantityAvailable > this.quantityTotal) {
    this.quantityAvailable = this.quantityTotal;
  }

  if (this.quantityAvailable === 0 && this.status === "available") {
    this.status = "sold";
  }
});

surplusMealSchema.index({ branchId: 1, status: 1, expiresAt: 1 });
surplusMealSchema.index({ status: 1, expiresAt: 1 });

export const SurplusMeal = mongoose.model("SurplusMeal", surplusMealSchema);
