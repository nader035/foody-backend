import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Branch } from "../models/branch.model.js";
import { SurplusMeal } from "../models/surplus-meal.model.js";
import { Donation } from "../models/donation.model.js";
import { CustomerOrder } from "../models/customer-order.model.js";
import { User } from "../models/user.model.js";

async function runSeedDomainData() {
  await connectDB();

  const manager = await User.findOne({ email: "manager@foody.com" });
  const staff = await User.findOne({ email: "staff@foody.com" });
  const customer = await User.findOne({ email: "customer@foody.com" });
  const charity = await User.findOne({ email: "charity@foody.org" });

  if (!manager || !staff || !customer || !charity) {
    throw new Error(
      "Seed users are missing. Run npm run seed first to create base users.",
    );
  }

  await Donation.deleteMany({});
  await CustomerOrder.deleteMany({});
  await SurplusMeal.deleteMany({});
  await Branch.deleteMany({ managerId: manager._id });

  const branchDocs = await Branch.create([
    {
      managerId: manager._id,
      name: "Downtown Main",
      code: "DT-01",
      address: {
        line1: "123 Main St",
        city: "Cairo",
        area: "Downtown",
        country: "Egypt",
      },
      contactPhone: "+201001234567",
    },
    {
      managerId: manager._id,
      name: "Mall Central",
      code: "MC-02",
      address: {
        line1: "789 Shopping Blvd",
        city: "Cairo",
        area: "Nasr City",
        country: "Egypt",
      },
      contactPhone: "+201001234568",
    },
    {
      managerId: manager._id,
      name: "Harbor View",
      code: "HV-03",
      address: {
        line1: "555 Harbor Dr",
        city: "Alexandria",
        area: "Corniche",
        country: "Egypt",
      },
      contactPhone: "+201001234569",
    },
  ]);

  const branchByName = Object.fromEntries(
    branchDocs.map((branch) => [branch.name, branch]),
  );

  staff.managerId = manager._id;
  staff.branchId = branchByName["Downtown Main"]._id;
  staff.branchName = "Downtown Main";
  staff.restaurantName = manager.restaurantName || staff.restaurantName;
  await staff.save();

  const now = Date.now();

  const mealDocs = await SurplusMeal.create([
    {
      branchId: branchByName["Downtown Main"]._id,
      createdBy: staff._id,
      title: "Grilled Chicken Rice",
      description: "Grilled chicken with seasoned rice and vegetables.",
      category: "lunch",
      quantityTotal: 12,
      quantityAvailable: 12,
      unitPrice: 6.49,
      currency: "EGP",
      status: "available",
      expiresAt: new Date(now + 1000 * 60 * 90),
      images: ["https://images.unsplash.com/photo-1663861623497-2151b2bb21fe"],
      tags: ["chicken", "rice", "grilled"],
      allergens: [],
    },
    {
      branchId: branchByName["Mall Central"]._id,
      createdBy: manager._id,
      title: "Pasta Alfredo",
      description: "Creamy alfredo pasta with parmesan.",
      category: "dinner",
      quantityTotal: 10,
      quantityAvailable: 10,
      unitPrice: 7.25,
      currency: "EGP",
      status: "available",
      expiresAt: new Date(now + 1000 * 60 * 70),
      images: ["https://images.unsplash.com/photo-1712746784067-e9e1bd86c043"],
      tags: ["pasta", "italian"],
      allergens: ["gluten", "dairy"],
    },
    {
      branchId: branchByName["Harbor View"]._id,
      createdBy: manager._id,
      title: "Chocolate Lava Cake",
      description: "Warm chocolate cake with molten center.",
      category: "bakery",
      quantityTotal: 8,
      quantityAvailable: 8,
      unitPrice: 4.49,
      currency: "EGP",
      status: "available",
      expiresAt: new Date(now + 1000 * 60 * 50),
      images: ["https://images.unsplash.com/photo-1607257882338-70f7dd2ae344"],
      tags: ["dessert", "chocolate"],
      allergens: ["gluten", "dairy", "eggs"],
    },
  ]);

  const donation = await Donation.create({
    mealId: mealDocs[0]._id,
    branchId: branchByName["Downtown Main"]._id,
    charityId: charity._id,
    matchedBy: manager._id,
    pickupCode: "PK-SEED01",
    quantity: 2,
    status: "matched",
    notes: "Seed donation for charity dashboard",
  });

  mealDocs[0].quantityAvailable -= donation.quantity;
  await mealDocs[0].save();

  await CustomerOrder.create({
    mealId: mealDocs[1]._id,
    branchId: branchByName["Mall Central"]._id,
    customerId: customer._id,
    quantity: 1,
    unitPrice: mealDocs[1].unitPrice,
    totalPrice: mealDocs[1].unitPrice,
    status: "paid",
    paymentMethod: "cash",
    paymentStatus: "paid",
    pickupWindowStart: new Date(),
    pickupWindowEnd: mealDocs[1].expiresAt,
    notes: "Seed customer order",
  });

  mealDocs[1].quantityAvailable -= 1;
  await mealDocs[1].save();

  console.log("Domain demo data seeded successfully.");

  await mongoose.disconnect();
}

runSeedDomainData().catch(async (error) => {
  console.error("Domain seeding failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
