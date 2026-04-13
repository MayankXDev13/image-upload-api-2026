import type { Request, Response, NextFunction } from "express";

interface MulterError extends Error {
  code?: string;
  status?: number;
}

interface ValidationError extends Error {
  name: "ValidationError";
  errors?: Record<string, { message: string }>;
  status?: number;
}

interface DuplicateError extends Error {
  code?: number;
  status?: number;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (!(err instanceof Error)) {
    res.status(500).json({
      error: { message: "Internal server error" },
    });
    return;
  }

  const error = err as MulterError | ValidationError | DuplicateError;

  if (error.message?.includes("Invalid file type")) {
    res.status(400).json({
      error: { message: error.message },
    });
    return;
  }

  if (error.name === "MulterError" || "code" in error) {
    const multerError = error as MulterError;

    if (multerError.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        error: { message: "File size exceeds 5MB limit" },
      });
      return;
    }

    if (multerError.code === "11000") {
      res.status(409).json({
        error: { message: "Resource already exists" },
      });
      return;
    }
  }

  if (error.name === "ValidationError") {
    const validationError = error as ValidationError;
    if (validationError.errors) {
      const messages = Object.values(validationError.errors)
        .map((e) => e.message)
        .join(", ");

      res.status(400).json({
        error: { message: messages },
      });
      return;
    }
  }

  const status = error.status || 500;

  res.status(status).json({
    error: {
      message: error.message || "Internal server error",
    },
  });
}