import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Image } from "../models/image.model.js";
import { generateThumbnail, getImageDimensions } from "../utils/thumbnail.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * TODO: Upload image
 *
 * 1. Check if file uploaded (if !req.file, return 400 "No file uploaded")
 * 2. Get file info from req.file (filename, originalname, mimetype, size)
 * 3. Get image dimensions using getImageDimensions(filepath)
 * 4. Generate thumbnail using generateThumbnail(filename)
 * 5. Extract optional fields from req.body (description, tags)
 *    - Parse tags: split by comma and trim each tag
 * 6. Save metadata to database (Image.create)
 * 7. Return 201 with image metadata
 */

export async function uploadImage(req, res, next) {
  try {
    // check file
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { filename, originalname, mimetype, size } = req.file;

    // validate mimetype
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(mimetype)) {
      return res.status(400).json({ error: "Invalid file type" });
    }

    // build file path
    const filepath = path.join(__dirname, "../uploads", filename);

    // get image dimensions
    const { width, height } = await getImageDimensions(filepath);

    // generate thumbnail
    await generateThumbnail(filename);

    // parse optional fields
    const description = (req.body.description || "").trim();

    const tags = req.body.tags
      ? req.body.tags
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter((tag) => tag.length > 0)
      : [];

    // remove duplicate tags
    const uniqueTags = [...new Set(tags)];

    // save to db
    const image = await Image.create({
      filename,
      originalName: originalname,
      mimetype,
      size,
      width,
      height,
      description,
      tags: uniqueTags,
    });

    // response
    return res.status(201).json({
      message: "Image uploaded successfully",
      data: image,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * TODO: List images with pagination and filtering
 *
 * 1. Extract query parameters:
 *    - page (default 1)
 *    - limit (default 10, max 50)
 *    - search (search in originalName and description)
 *    - mimetype (filter by mimetype)
 *    - sortBy (field to sort by, default 'uploadDate')
 *    - sortOrder (asc or desc, default 'desc')
 *
 * 2. Build MongoDB query:
 *    - Add text search if search parameter provided
 *    - Add mimetype filter if provided
 *
 * 3. Calculate pagination:
 *    - skip = (page - 1) * limit
 *    - total = await Image.countDocuments(query)
 *    - pages = Math.ceil(total / limit)
 *
 * 4. Fetch images with sorting and pagination:
 *    - Image.find(query).sort({[sortBy]: sortOrder === 'asc' ? 1 : -1}).skip(skip).limit(limit)
 *
 * 5. Calculate totalSize (sum of all image sizes)
 *
 * 6. Return 200 with:
 *    - data: images array
 *    - meta: { total, page, limit, pages, totalSize }
 */
export async function listImages(req, res, next) {
  try {
    // parse and validate query parameters
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const search = (req.query.search || "").trim();
    const mimetype = req.query.mimetype || "";

    const allowedSortFields = ["uploadDate", "originalName", "size"];
    const sortBy = allowedSortFields.includes(req.query.sortBy)
      ? req.query.sortBy
      : "uploadDate";

    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    // build query
    const query = {};

    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (mimetype) {
      query.mimetype = mimetype;
    }

    // pagination
    const skip = (page - 1) * limit;

    // run queries in parallel for better performance
    const [total, images, totalSizeAgg] = await Promise.all([
      Image.countDocuments(query),

      Image.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(), // improves performance

      Image.aggregate([
        { $match: query },
        { $group: { _id: null, totalSize: { $sum: "$size" } } },
      ]),
    ]);

    const pages = Math.ceil(total / limit);
    const totalSize = totalSizeAgg[0]?.totalSize || 0;

    //  response
    return res.status(200).json({
      data: images,
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

/**
 * TODO: Get image metadata by ID
 *
 * 1. Find image by req.params.id
 * 2. If not found: return 404 "Image not found"
 * 3. Return 200 with image metadata
 */
export async function getImage(req, res, next) {
  try {
    const image = await Image.findById(req.params.id).lean();

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    return res.status(200).json({ data: image });
  } catch (error) {
    next(error);
  }
}

/**
 * TODO: Download original image
 *
 * 1. Find image by req.params.id
 * 2. If not found: return 404 "Image not found"
 * 3. Construct file path
 * 4. Check if file exists using fs.existsSync()
 * 5. If file missing: return 404 "File not found"
 * 6. Set headers:
 *    - Content-Type: image.mimetype
 *    - Content-Disposition: attachment; filename="originalName"
 * 7. Send file using res.sendFile(filepath)
 */
export async function downloadImage(req, res, next) {
  try {
    const image = await Image.findById(req.params.id).lean();

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }
    const filepath = path.join(__dirname, "../uploads", image.filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.setHeader("Content-Type", image.mimetype);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${image.originalName}"`,
    );

    return res.sendFile(filepath);
  } catch (error) {
    next(error);
  }
}

/**
 * TODO: Download thumbnail
 *
 * 1. Find image by req.params.id
 * 2. If not found: return 404 "Image not found"
 * 3. Construct thumbnail path
 * 4. Check if thumbnail exists
 * 5. If missing: return 404 "File not found"
 * 6. Set headers:
 *    - Content-Type: image/jpeg (thumbnails are always JPEG)
 * 7. Send file using res.sendFile(thumbnailPath)
 */
export async function downloadThumbnail(req, res, next) {
  try {
    const image = await Image.findById(req.params.id).lean();

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    // construct thumbnail path
    const thumbnailName = `${image.filename}.jpg`;
    const thumbnailPath = path.join(
      __dirname,
      "../uploads/thumbnails",
      thumbnailName,
    );

    // check if thumbnail exists
    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // set headers
    res.setHeader("Content-Type", "image/jpeg");

    // optional: inline display instead of download
    res.setHeader("Content-Disposition", `inline; filename="${thumbnailName}"`);

    // send file
    return res.sendFile(thumbnailPath);
  } catch (error) {
    next(error);
  }
}

/**
 * TODO: Delete image
 *
 * 1. Find image by req.params.id
 * 2. If not found: return 404 "Image not found"
 * 3. Delete original file (use try-catch, ignore ENOENT errors)
 * 4. Delete thumbnail (use try-catch, ignore ENOENT errors)
 * 5. Delete metadata from database
 * 6. Return 204 (no content)
 */
export async function deleteImage(req, res, next) {
  try {
    const image = await Image.findById(req.params.id).lean();

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    const filePath = path.join(__dirname, "../uploads", image.filename);

    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    const thumbnailPath = path.join(
      __dirname,
      "../uploads/thumbnails",
      `${image.filename}.jpg`,
    );

    try {
      await fs.promises.unlink(thumbnailPath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    await Image.findByIdAndDelete(req.params.id);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
