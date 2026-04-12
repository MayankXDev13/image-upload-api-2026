import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) {
    throw new Error("MongoDB URI is required");
  }

  await mongoose.connect(uri);
  return mongoose.connection;
}
