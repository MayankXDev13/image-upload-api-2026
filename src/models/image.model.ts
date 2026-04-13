import mongoose, { Schema, Document } from "mongoose";

export interface IImage extends Document {
  originalName: string;
  filename: string;
  mimetype: "image/jpeg" | "image/png" | "image/gif";
  size: number;
  width: number;
  height: number;
  thumbnailFilename: string;
  description: string;
  tags: string[];
  uploadDate: Date;
}

const imageSchema = new Schema<IImage>(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    mimetype: {
      type: String,
      required: true,
      enum: ["image/jpeg", "image/png", "image/gif"],
    },
    size: {
      type: Number,
      required: true,
      min: 1,
      max: 5 * 1024 * 1024,
    },
    width: {
      type: Number,
      required: true,
      min: 1,
    },
    height: {
      type: Number,
      required: true,
      min: 1,
    },
    thumbnailFilename: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 10,
        message: "Cannot have more than 10 tags",
      },
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

imageSchema.index({ uploadDate: -1 });
imageSchema.index({ mimetype: 1, uploadDate: -1 });
imageSchema.index({ originalName: "text", description: "text" });

export const Image = mongoose.model<IImage>("Image", imageSchema);
