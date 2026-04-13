import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./db/connect.js";
import logger from "./logger/winston.logger.js";

async function start(): Promise<void> {
  try {
    const port = process.env.PORT || "3000";
    const uri =
      process.env.MONGO_URI || "mongodb://localhost:27017/image_upload_api";

    await connectDB(uri);
    const app = createApp();

    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
