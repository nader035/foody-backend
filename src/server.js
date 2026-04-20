import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

export async function startServer() {
  try {
    await connectDB();
    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}
