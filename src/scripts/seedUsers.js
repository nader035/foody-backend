import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/user.model.js";

async function runSeed() {
  await connectDB();

  await User.deleteMany({
    email: {
      $in: [
        "manager@foody.com",
        "customer@foody.com",
        "charity@foody.org",
        "staff@foody.com",
      ],
    },
  });

  await User.create([
    {
      fullName: "Foody Manager",
      email: "manager@foody.com",
      password: "Password1",
      role: "manager",
      phone: "+201001234567",
      restaurantName: "FreshBites",
    },
    {
      fullName: "Foody Customer",
      email: "customer@foody.com",
      password: "Password1",
      role: "customer",
    },
    {
      fullName: "Foody Charity",
      email: "charity@foody.org",
      password: "Password1",
      role: "charity",
      phone: "+201009998887",
      organizationName: "City Food Bank",
      organizationAddress: "Downtown Street, Cairo",
      organizationWebsite: "https://cityfoodbank.org",
    },
    {
      fullName: "Foody Staff",
      email: "staff@foody.com",
      password: "Password1",
      role: "staff",
      branchName: "Downtown Main",
      restaurantName: "FreshBites",
    },
  ]);

  console.log("Seed users inserted.");
  await mongoose.disconnect();
}

runSeed().catch(async (error) => {
  console.error("Seeding failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
