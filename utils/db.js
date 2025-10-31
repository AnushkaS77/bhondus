import mongoose from "mongoose";

export default async function db() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    const dbUri = process.env.DATABASE;
    if (!dbUri) {
      throw new Error("Database URI is not provided");
    }
    await mongoose.connect(dbUri);
  } catch (err) {
    console.log("DB CONNECTION ERR!!", err);
  }
}
