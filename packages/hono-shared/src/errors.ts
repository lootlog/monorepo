import type { Context } from "hono";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    "status" in error &&
    typeof error.status === "number"
  );
}

type ErrorLogger = {
  error(message: string, meta?: Record<string, unknown>): void;
};

type ErrorResponseBody = {
  message: string;
};

export interface JsonErrorHandlerOptions {
  internalServerErrorMessage?: string;
  logger?: ErrorLogger;
  logMessage?: string;
  mapAppError?: (error: AppError, context: Context) => ErrorResponseBody;
  mapUnexpectedError?: (error: unknown, context: Context) => ErrorResponseBody;
}

export function createJsonErrorHandler({
  internalServerErrorMessage = "Internal Server Error",
  logger,
  logMessage = "Unhandled request error",
  mapAppError,
  mapUnexpectedError,
}: JsonErrorHandlerOptions = {}) {
  return (error: unknown, context: Context) => {
    if (isAppError(error)) {
      const body = mapAppError?.(error, context) ?? { message: error.message };
      return context.json(body, error.status as 400 | 401 | 403 | 404 | 500);
    }

    logger?.error(logMessage, {
      method: context.req.method,
      path: context.req.path,
      error,
    });

    const body = mapUnexpectedError?.(error, context) ?? {
      message: internalServerErrorMessage,
    };

    return context.json(body, 500);
  };
}
