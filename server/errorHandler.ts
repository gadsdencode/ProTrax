import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Centralized error handling middleware
 * Catches and standardizes error responses for different error types
 */
export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("Error occurred:", {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    return res.status(400).json({
      error: "Validation Error",
      message: "Request validation failed",
      details: formattedErrors,
    });
  }

  // Handle Drizzle/Postgres database errors
  if (err.message?.includes("duplicate key") || (err as any).code === "23505") {
    return res.status(409).json({
      error: "Duplicate Entry",
      message: "A record with this value already exists",
      details: extractDuplicateKeyInfo(err.message),
    });
  }

  if (err.message?.includes("foreign key constraint") || (err as any).code === "23503") {
    return res.status(400).json({
      error: "Invalid Reference",
      message: "Referenced record does not exist",
      details: extractForeignKeyInfo(err.message),
    });
  }

  if (err.message?.includes("violates not-null constraint") || (err as any).code === "23502") {
    return res.status(400).json({
      error: "Missing Required Field",
      message: "A required field is missing",
      details: extractNullConstraintInfo(err.message),
    });
  }

  if (err.message?.includes("violates check constraint") || (err as any).code === "23514") {
    return res.status(400).json({
      error: "Invalid Value",
      message: "Value does not meet constraints",
      details: extractCheckConstraintInfo(err.message),
    });
  }

  // Handle custom app errors with status codes
  const appError = err as AppError;
  if (appError.statusCode) {
    return res.status(appError.statusCode).json({
      error: err.name || "Application Error",
      message: err.message,
    });
  }

  // Handle 404 Not Found errors
  if (err.message?.toLowerCase().includes("not found")) {
    return res.status(404).json({
      error: "Not Found",
      message: err.message,
    });
  }

  // Handle unauthorized errors
  if (err.message?.toLowerCase().includes("unauthorized") || err.message?.toLowerCase().includes("not authenticated")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: err.message || "Authentication required",
    });
  }

  // Handle forbidden errors
  if (err.message?.toLowerCase().includes("forbidden") || err.message?.toLowerCase().includes("not allowed")) {
    return res.status(403).json({
      error: "Forbidden",
      message: err.message || "You do not have permission to perform this action",
    });
  }

  // Default to 500 Internal Server Error
  return res.status(500).json({
    error: "Internal Server Error",
    message: "An unexpected error occurred",
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
}

/**
 * Helper function to extract duplicate key information from error message
 */
function extractDuplicateKeyInfo(message: string): string {
  const match = message.match(/Key \((.*?)\)=\((.*?)\)/);
  if (match) {
    return `${match[1]}: ${match[2]}`;
  }
  return message;
}

/**
 * Helper function to extract foreign key information from error message
 */
function extractForeignKeyInfo(message: string): string {
  const match = message.match(/Key \((.*?)\)=\((.*?)\)/);
  if (match) {
    return `Invalid ${match[1]}: ${match[2]}`;
  }
  return message;
}

/**
 * Helper function to extract null constraint information from error message
 */
function extractNullConstraintInfo(message: string): string {
  const match = message.match(/column "(.*?)"/);
  if (match) {
    return `Field '${match[1]}' is required`;
  }
  return message;
}

/**
 * Helper function to extract check constraint information from error message
 */
function extractCheckConstraintInfo(message: string): string {
  const match = message.match(/constraint "(.*?)"/);
  if (match) {
    return `Constraint '${match[1]}' violated`;
  }
  return message;
}

/**
 * Custom error class for application-specific errors
 */
export class ApplicationError extends Error implements AppError {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = "ApplicationError";
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Helper to create common error types
 */
export const createError = {
  notFound: (message: string = "Resource not found") => 
    new ApplicationError(message, 404, "NOT_FOUND"),
  
  badRequest: (message: string = "Bad request") => 
    new ApplicationError(message, 400, "BAD_REQUEST"),
  
  unauthorized: (message: string = "Unauthorized") => 
    new ApplicationError(message, 401, "UNAUTHORIZED"),
  
  forbidden: (message: string = "Forbidden") => 
    new ApplicationError(message, 403, "FORBIDDEN"),
  
  conflict: (message: string = "Conflict") => 
    new ApplicationError(message, 409, "CONFLICT"),
  
  internal: (message: string = "Internal server error") => 
    new ApplicationError(message, 500, "INTERNAL_ERROR"),
};

/**
 * Async route handler wrapper to catch errors and pass to error middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
