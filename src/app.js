import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import imageRoutes from "./routes/image.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { notFound } from "./middlewares/notFound.middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(express.json());

  const uploadsDir = path.join(__dirname, "uploads");
  const thumbnailsDir = path.join(uploadsDir, "thumbnails");

  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(thumbnailsDir, { recursive: true });

  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/images", imageRoutes);

  app.use(notFound);

  app.use(errorHandler);

  return app;
}
