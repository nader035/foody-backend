import mongoose from "mongoose";
import { connectDB } from "../config/db.js";

async function resetDatabase() {
  await connectDB();

  const collectionInfos = await mongoose.connection.db
    .listCollections()
    .toArray();
  const collections = collectionInfos.map((item) => item.name);

  for (const name of collections) {
    await mongoose.connection.db.collection(name).deleteMany({});
  }

  console.log(
    `Database reset completed. Cleared ${collections.length} collections.`,
  );
  await mongoose.disconnect();
}

resetDatabase().catch(async (error) => {
  console.error("Database reset failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
