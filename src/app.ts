import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import imageRoutes from "./routes/image.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { notFound } from "./middlewares/notFound.middleware.js";
import morganMiddleware from "./logger/morgan.logger.js";
import logger from "./logger/winston.logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(morganMiddleware);

  const uploadsDir = path.join(__dirname, "../uploads");
  const thumbnailsDir = path.join(uploadsDir, "thumbnails");

  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(thumbnailsDir, { recursive: true });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/images", imageRoutes);

  app.use(notFound);

  app.use(errorHandler);

  return app;
}
