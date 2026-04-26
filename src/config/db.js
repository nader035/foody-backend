import mongoose from "mongoose";
import { env } from "./env.js";

function maskUri(uri) {
  try {
    return uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
  } catch {
    return "[masked]";
  }
}

export async function connectDB() {
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log(`MongoDB connected successfully at ${maskUri(env.mongoUri)}`);
  } catch (error) {
    console.error("MongoDB connection failed.");
    console.error(`Connection URI: ${maskUri(env.mongoUri)}`);
    console.error(
      "If you use local MongoDB, make sure mongod is running on port 27017.",
    );
    throw error;
  }
}

