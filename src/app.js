import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import userRoutes from "./routes/user.routes.js";
import branchRoutes from "./routes/branch.routes.js";
import surplusMealRoutes from "./routes/surplus-meal.routes.js";
import donationRoutes from "./routes/donation.routes.js";
import customerOrderRoutes from "./routes/customer-order.routes.js";
import auditLogRoutes from "./routes/audit-log.routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Foody backend is healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/branches", branchRoutes);
app.use("/api/v1/meals", surplusMealRoutes);
app.use("/api/v1/donations", donationRoutes);
app.use("/api/v1/orders", customerOrderRoutes);
app.use("/api/v1/audit-logs", auditLogRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
