import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 24,
      index: true,
      sparse: true,
    },
    address: {
      line1: { type: String, trim: true, default: null },
      city: { type: String, trim: true, default: null },
      area: { type: String, trim: true, default: null },
      country: { type: String, trim: true, default: "Egypt" },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    contactPhone: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    settings: {
      autoAssignToCharity: { type: Boolean, default: true },
      publicListingEnabled: { type: Boolean, default: true },
      donationSplitPercentage: { type: Number, default: 50, min: 0, max: 100 },
      discountPercentage: { type: Number, default: 35, min: 0, max: 100 },
    },
  },
  {
    timestamps: true,
  },
);

branchSchema.index({ managerId: 1, name: 1 }, { unique: true });
branchSchema.index({ location: "2dsphere" });

export const Branch = mongoose.model("Branch", branchSchema);
