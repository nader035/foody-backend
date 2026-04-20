import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log(`MongoDB connected successfully at ${env.mongoUri}`);
  } catch (error) {
    console.error("MongoDB connection failed.");
    console.error(`Connection URI: ${env.mongoUri}`);
    console.error(
      "If you use local MongoDB, make sure mongod is running on port 27017.",
    );
    throw error;
  }
}
