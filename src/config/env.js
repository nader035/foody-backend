import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

function normalizeMongoUri(uri) {
  if (!uri) {
    return uri;
  }

  // On some Windows setups, localhost may resolve to ::1 while MongoDB listens on 127.0.0.1.
  return uri.replace("mongodb://localhost", "mongodb://127.0.0.1");
}

if (isProduction) {
  const requiredVars = ["MONGO_URI", "JWT_SECRET"];

  for (const variable of requiredVars) {
    if (!process.env[variable]) {
      throw new Error(`Missing required environment variable: ${variable}`);
    }
  }
}

const defaultMongoUri = "mongodb://127.0.0.1:27017/foody";
const defaultJwtSecret = "dev-only-jwt-secret-change-me";

if (!process.env.MONGO_URI && !isProduction) {
  console.warn(
    `[env] MONGO_URI is not set. Using development default: ${defaultMongoUri}`,
  );
}

if (!process.env.JWT_SECRET && !isProduction) {
  console.warn("[env] JWT_SECRET is not set. Using development fallback secret.");
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongoUri: normalizeMongoUri(process.env.MONGO_URI || defaultMongoUri),
  jwtSecret: process.env.JWT_SECRET || defaultJwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
};
