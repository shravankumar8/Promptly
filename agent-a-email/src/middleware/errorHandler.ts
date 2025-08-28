import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error("Error occurred:", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  if (error instanceof AppError) {
    res.status(error.status).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle specific error types
  if (error.name === "ValidationError") {
    res.status(400).json({
      success: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.message,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Default server error
  res.status(500).json({
    success: false,
    error: {
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    },
    timestamp: new Date().toISOString(),
  });
};
