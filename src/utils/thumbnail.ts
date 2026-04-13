import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, "thumbnails");

export async function generateThumbnail(filename: string): Promise<string> {
  const inputPath = path.join(__dirname, "../../uploads", filename);
  const thumbnailName = "thumb-" + filename.replace(/\.\w+$/, ".jpg");
  const outputPath = path.join(THUMBNAILS_DIR, thumbnailName);

  const metadata = await sharp(inputPath).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width <= 200 && height <= 200) {
    fs.copyFileSync(inputPath, outputPath);
  } else {
    await sharp(inputPath)
      .resize({
        width: 200,
        height: 200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 50 })
      .toFile(outputPath);
  }

  return thumbnailName;
}

export async function getImageDimensions(
  filepath: string,
): Promise<{ width: number; height: number }> {
  const dims = await sharp(filepath).metadata();
  return {
    width: dims.width ?? 0,
    height: dims.height ?? 0,
  };
}
