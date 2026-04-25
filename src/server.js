import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

import mongoose from "mongoose";

export async function startServer() {
  try {
    await connectDB();
    const server = app.listen(env.port, () => {
      console.log(`Server running on port ${env.port} in ${env.nodeEnv} mode`);
    });

    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log("HTTP server closed.");
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
          console.log("MongoDB connection closed.");
        }
        process.exit(0);
      });

      // Force shutdown after 10s
      setTimeout(() => {
        console.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}
