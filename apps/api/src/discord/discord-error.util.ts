import { RateLimitError } from "@discordjs/rest";
import {
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { DiscordRateLimiterService } from "./discord-rate-limiter.service";
import type {
  DiscordInvalidRequestEndpoint,
  DiscordSyncDiagnosticsService,
} from "./discord-sync-diagnostics.service";

export type DiscordInvalidRequestStatus = 401 | 403 | 429;

type DiscordHttpError = {
  status: number;
};

export function extractHttpStatus(error: unknown): number | null {
  if (error instanceof HttpException) {
    return error.getStatus();
  }

  if (!hasHttpStatus(error)) {
    return null;
  }

  return error.status;
}

function hasHttpStatus(error: unknown): error is DiscordHttpError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "status" in error && typeof error.status === "number";
}

export function isDiscordNotFoundError(error: unknown): boolean {
  return extractHttpStatus(error) === HttpStatus.NOT_FOUND;
}

export function createDiscordRateLimitException(
  retryAfterMs?: number,
): HttpException {
  const retryAfterSeconds =
    retryAfterMs === undefined ? undefined : Math.ceil(retryAfterMs / 1000);

  return new HttpException(
    {
      message: "DISCORD_RATE_LIMITED",
      retryAfter: retryAfterSeconds,
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

export async function throwIfDiscordRateLimited(
  rateLimiter: DiscordRateLimiterService,
  userId: string,
  endpoint: string,
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

  throw createDiscordRateLimitException(retryAfterMs);
}

export async function recordInvalidDiscordRequest(
  diagnostics: DiscordSyncDiagnosticsService,
  endpoint: DiscordInvalidRequestEndpoint,
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

export function toDiscordRequestException(error: unknown): Error {
  if (error instanceof RateLimitError) {
    return createDiscordRateLimitException(error.retryAfter);
  }

  if (error instanceof HttpException) {
    return error;
  }

  const status = extractHttpStatus(error);
  if (status === HttpStatus.UNAUTHORIZED) {
    return new UnauthorizedException({
      message: "DISCORD_UNAUTHORIZED",
      requiresReauth: true,
    });
  }

  if (status === HttpStatus.NOT_FOUND) {
    return new NotFoundException();
  }

  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    return createDiscordRateLimitException();
  }

  if (status !== null && status >= 500) {
    return new ServiceUnavailableException({
      message: "DISCORD_SERVICE_UNAVAILABLE",
      status,
    });
  }

  if (status !== null) {
    return new HttpException(
      {
        message: "DISCORD_HTTP_ERROR",
        status,
      },
      status,
    );
  }

  return new ServiceUnavailableException({
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
