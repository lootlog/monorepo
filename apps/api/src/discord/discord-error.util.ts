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
import { Clock, Effect } from "effect";
import type { DiscordRateLimiter } from "./discord-rate-limiter.service.js";
import type { DiscordSyncDiagnostics } from "./discord-sync-diagnostics.service.js";
import type {
  DiscordEndpoint,
  DiscordInvalidRequestStatus,
} from "./discord.types.js";

type DiscordApplicationError = {
  status: number;
};

function extractHttpStatus(error: unknown): number | null {
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

export function isDiscordUnauthorizedError(error: unknown): boolean {
  return extractHttpStatus(error) === HttpStatus.UNAUTHORIZED;
}

function createDiscordRateLimitError(retryAfterMs?: number): ApplicationError {
  return new RateLimitedError({
    code: "DISCORD_RATE_LIMITED",
    retryAfterMs,
  });
}

export const failIfDiscordRateLimited = (
  rateLimiter: Pick<
    DiscordRateLimiter,
    "checkRateLimitForUser" | "getNextAvailableAtForUser"
  >,
  userId: string,
  endpoint: DiscordEndpoint,
) =>
  Effect.gen(function* () {
    const isRateLimited = yield* rateLimiter.checkRateLimitForUser(
      userId,
      endpoint,
    );

    if (!isRateLimited) {
      return;
    }

    const nextAvailableAt = yield* rateLimiter.getNextAvailableAtForUser(
      userId,
      endpoint,
    );

    const retryAfterMs = nextAvailableAt
      ? Math.max(
          nextAvailableAt.getTime() - (yield* Clock.currentTimeMillis),
          0,
        )
      : undefined;

    return yield* Effect.fail(createDiscordRateLimitError(retryAfterMs));
  });

export const recordInvalidDiscordRequest = (
  diagnostics: Pick<DiscordSyncDiagnostics, "recordInvalidDiscordRequest">,
  endpoint: DiscordEndpoint,
  error: unknown,
): Effect.Effect<void> => {
  const status = getInvalidDiscordRequestStatus(error);

  return status === null
    ? Effect.void
    : diagnostics.recordInvalidDiscordRequest({
        endpoint,
        status,
        source: "discord-service",
      });
};

export function toDiscordRequestError(error: unknown): ApplicationError {
  if (error instanceof RateLimitError) {
    return createDiscordRateLimitError(error.retryAfter);
  }

  if (error instanceof ApplicationError) {
    return error;
  }

  const status = extractHttpStatus(error);

  if (status === HttpStatus.UNAUTHORIZED) {
    return new AuthenticationRequiredError({ code: "DISCORD_UNAUTHORIZED" });
  }

  if (status === HttpStatus.NOT_FOUND) {
    return new ResourceNotFoundError();
  }

  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    return createDiscordRateLimitError();
  }

  if (status !== null && status >= 500) {
    return new DependencyUnavailableError({
      code: "DISCORD_SERVICE_UNAVAILABLE",
    });
  }

  if (status !== null) {
    return new DependencyUnavailableError({
      code: "DISCORD_HTTP_ERROR",
      details: { status },
    });
  }

  return new DependencyUnavailableError({ code: "DISCORD_REQUEST_FAILED" });
}

function getInvalidDiscordRequestStatus(
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
