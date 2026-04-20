import { httpInstrumentationMiddleware } from "@hono/otel";
import { createMiddleware } from "hono/factory";

type RequestLogger = {
  info(message: string, meta?: Record<string, unknown>): void;
};

export interface RequestLoggingOptions {
  logger: RequestLogger;
  logMessage?: string;
  shouldSkip?: (path: string) => boolean;
  skipPaths?: string[];
}

type HttpInstrumentationOptions = Parameters<
  typeof httpInstrumentationMiddleware
>[0] & {
  enabled?: boolean;
};

export function createRequestLoggingMiddleware({
  logger,
  logMessage = "Request completed",
  shouldSkip,
  skipPaths = [],
}: RequestLoggingOptions) {
  return createMiddleware(async (context, next) => {
    const startedAt = Date.now();

    await next();

    const path = context.req.path;
    const skip =
      skipPaths.includes(path) || (shouldSkip ? shouldSkip(path) : false);

    if (skip) {
      return;
    }

    logger.info(logMessage, {
      method: context.req.method,
      path,
      status: context.res.status,
      durationMs: Date.now() - startedAt,
    });
  });
}

export function createSafeHttpInstrumentationMiddleware({
  enabled = true,
  ...options
}: HttpInstrumentationOptions) {
  const instrumentationMiddleware = httpInstrumentationMiddleware(options);

  return createMiddleware(async (context, next) => {
    if (!enabled) {
      await next();
      return;
    }

    try {
      return await instrumentationMiddleware(context, next);
    } catch (error) {
      const isMatchedRoutesError =
        error instanceof TypeError &&
        error.message.includes("reading '0'") &&
        error.stack?.includes("matchedRoutes");

      if (!isMatchedRoutesError) {
        throw error;
      }

      await next();
    }
  });
}
