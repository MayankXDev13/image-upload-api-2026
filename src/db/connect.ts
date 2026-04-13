import mongoose, { type Connection } from "mongoose";

export async function connectDB(uri: string): Promise<Connection> {
  if (!uri) {
    throw new Error("MongoDB URI is required");
  }

  await mongoose.connect(uri);
  return mongoose.connection;
}