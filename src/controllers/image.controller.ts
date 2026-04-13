import type { Request, Response, NextFunction } from "express";
import type { IImage } from "../models/image.model.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Image } from "../models/image.model.js";
import { generateThumbnail, getImageDimensions } from "../utils/thumbnail.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export async function uploadImage(
  req: MulterRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: { message: "No file uploaded" } });
      return;
    }

    const { filename, originalname, mimetype, size } = req.file;

    const filepath = path.join(__dirname, "../../uploads", filename);
    const { width, height } = await getImageDimensions(filepath);

    const thumbnailFilename = await generateThumbnail(filename);

    const description = (req.body.description || "").trim();

    const tags = req.body.tags
      ? (req.body.tags as string)
          .split(",")
          .map((tag: string) => tag.trim().toLowerCase())
          .filter((tag: string) => tag.length > 0)
      : [];

    const uniqueTags = [...new Set(tags)];

    const image = await Image.create({
      filename,
      originalName: originalname,
      mimetype,
      size,
      width,
      height,
      description,
      tags: uniqueTags,
      thumbnailFilename,
    });

    res.status(201).json(image);
  } catch (error) {
    next(error);
  }
}

interface ListQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  mimetype?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface ListResponse {
  data: IImage[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    totalSize: number;
  };
}

export async function listImages(
  req: Request<unknown, unknown, unknown, ListQueryParams>,
  res: Response<ListResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(parseInt(req.query.page ?? "1") || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit ?? "10") || 1, 1),
      50,
    );
    const search = (req.query.search || "").trim();
    const mimetype = req.query.mimetype || "";

    const allowedSortFields = ["uploadDate", "originalName", "size"];
    const sortByRaw = req.query.sortBy ?? "";
    const sortBy = allowedSortFields.includes(sortByRaw)
      ? sortByRaw
      : "uploadDate";

    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (mimetype) {
      query.mimetype = mimetype;
    }

    const skip = (page - 1) * limit;

    const [total, images, totalSizeAgg] = await Promise.all([
      Image.countDocuments(query),

      Image.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),

      Image.aggregate([
        { $match: query },
        { $group: { _id: null, totalSize: { $sum: "$size" } } },
      ]),
    ]);

    const pages = Math.ceil(total / limit);
    const totalSize = totalSizeAgg[0]
      ? (totalSizeAgg[0] as { totalSize: number }).totalSize
      : 0;

    res.status(200).json({
      data: images as unknown as IImage[],
      meta: {
        total,
        page,
        limit,
        pages,
        totalSize,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getImage(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const image = await Image.findById(req.params.id).lean();

    if (!image) {
      res.status(404).json({ error: { message: "Image not found" } });
      return;
    }

    res.status(200).json(image);
  } catch (error) {
    next(error);
  }
}

export async function downloadImage(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const image = await Image.findById(req.params.id).lean();

    if (!image) {
      res.status(404).json({ error: { message: "Image not found" } });
      return;
    }

    const filepath = path.join(__dirname, "../../uploads", image.filename);

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: { message: "File not found" } });
      return;
    }

    res.setHeader("Content-Type", image.mimetype);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${image.originalName}"`,
    );

    res.sendFile(filepath);
  } catch (error) {
    next(error);
  }
}

export async function downloadThumbnail(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const image = await Image.findById(req.params.id).lean();

    if (!image) {
      res.status(404).json({ error: { message: "Image not found" } });
      return;
    }

    const thumbnailPath = path.join(
      __dirname,
      "../../uploads/thumbnails",
      image.thumbnailFilename,
    );

    if (!fs.existsSync(thumbnailPath)) {
      res.status(404).json({ error: { message: "File not found" } });
      return;
    }

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${image.thumbnailFilename}"`,
    );

    res.sendFile(thumbnailPath);
  } catch (error) {
    next(error);
  }
}

export async function deleteImage(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const image = await Image.findById(req.params.id).lean();

    if (!image) {
      res.status(404).json({ error: { message: "Image not found" } });
      return;
    }

    const filePath = path.join(__dirname, "../../uploads", image.filename);

    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const thumbnailPath = path.join(
      __dirname,
      "../../uploads/thumbnails",
      image.thumbnailFilename,
    );

    try {
      await fs.promises.unlink(thumbnailPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    await Image.findByIdAndDelete(req.params.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
