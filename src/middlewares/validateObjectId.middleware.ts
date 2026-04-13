import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export function validateObjectId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { id } = req.params;

  if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      error: { message: "Invalid id format" },
    });
    return;
  }

  next();
}
