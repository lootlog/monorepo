import { RateLimitError } from "@discordjs/rest";
import {
  ApplicationError,
  applicationErrorStatus,
  HttpStatus,
  RateLimitedError,
  ResourceNotFoundError,
  DependencyUnavailableError,
  AuthenticationRequiredError,
} from "#src/shared/http/http-errors";
import type { DiscordRateLimiterService } from "./discord-rate-limiter.service.js";
import type { DiscordSyncDiagnosticsService } from "./discord-sync-diagnostics.service.js";
import type {
  DiscordEndpoint,
  DiscordInvalidRequestStatus,
} from "./discord.types.js";

type DiscordApplicationError = {
  status: number;
};

export function extractHttpStatus(error: unknown): number | null {
  if (error instanceof ApplicationError) {
    return applicationErrorStatus(error);
  }

  if (!hasHttpStatus(error)) {
    return null;
  }

  return error.status;
}

function hasHttpStatus(error: unknown): error is DiscordApplicationError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "status" in error && typeof error.status === "number";
}

export function isDiscordNotFoundError(error: unknown): boolean {
  return extractHttpStatus(error) === HttpStatus.NOT_FOUND;
}

export function createDiscordRateLimitError(
  retryAfterMs?: number,
): ApplicationError {
  const retryAfterSeconds =
    retryAfterMs === undefined ? undefined : Math.ceil(retryAfterMs / 1000);

  return new RateLimitedError({
    message: "DISCORD_RATE_LIMITED",
    retryAfter: retryAfterSeconds,
  });
}

export async function throwIfDiscordRateLimited(
  rateLimiter: DiscordRateLimiterService,
  userId: string,
  endpoint: DiscordEndpoint,
): Promise<void> {
  const isRateLimited = await rateLimiter.checkRateLimitForUser(
    userId,
    endpoint,
  );

  if (!isRateLimited) {
    return;
  }

  const nextAvailableAt = await rateLimiter.getNextAvailableAtForUser(
    userId,
    endpoint,
  );
  const retryAfterMs = nextAvailableAt
    ? Math.max(nextAvailableAt.getTime() - Date.now(), 0)
    : undefined;

  throw createDiscordRateLimitError(retryAfterMs);
}

export async function recordInvalidDiscordRequest(
  diagnostics: DiscordSyncDiagnosticsService,
  endpoint: DiscordEndpoint,
  error: unknown,
): Promise<void> {
  const status = getInvalidDiscordRequestStatus(error);

  if (status === null) {
    return;
  }

  await diagnostics.recordInvalidDiscordRequest({
    endpoint,
    status,
    source: "discord-service",
  });
}

export function toDiscordRequestError(error: unknown): Error {
  if (error instanceof RateLimitError) {
    return createDiscordRateLimitError(error.retryAfter);
  }

  if (error instanceof ApplicationError) {
    return error;
  }

  const status = extractHttpStatus(error);
  if (status === HttpStatus.UNAUTHORIZED) {
    return new AuthenticationRequiredError({
      message: "DISCORD_UNAUTHORIZED",
      requiresReauth: true,
    });
  }

  if (status === HttpStatus.NOT_FOUND) {
    return new ResourceNotFoundError();
  }

  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    return createDiscordRateLimitError();
  }

  if (status !== null && status >= 500) {
    return new DependencyUnavailableError({
      message: "DISCORD_SERVICE_UNAVAILABLE",
      status,
    });
  }

  if (status !== null) {
    return new DependencyUnavailableError({
      message: "DISCORD_HTTP_ERROR",
      status,
    });
  }

  return new DependencyUnavailableError({
    message: "DISCORD_REQUEST_FAILED",
  });
}

export function getInvalidDiscordRequestStatus(
  error: unknown,
): DiscordInvalidRequestStatus | null {
  if (error instanceof RateLimitError) {
    return 429;
  }

  const status = extractHttpStatus(error);
  if (status === HttpStatus.UNAUTHORIZED) {
    return 401;
  }

  if (status === HttpStatus.FORBIDDEN) {
    return 403;
  }

  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    return 429;
  }

  return null;
}
