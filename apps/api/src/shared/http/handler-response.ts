import { Effect, Schema } from "effect";
import { HttpServerResponse } from "effect/http";
import {
  type HttpErrorResponse,
  ReauthenticationRequired,
} from "#src/http-api/contracts/shared";

/** The only way a handler writes an error body; see `HttpErrorResponse`. */
export const httpErrorResponse = (
  status: number,
  body: HttpErrorResponse,
  retryAfterMs?: number,
) =>
  HttpServerResponse.jsonUnsafe(body, {
    status,
    headers:
      retryAfterMs === undefined
        ? undefined
        : { "retry-after": String(Math.ceil(retryAfterMs / 1000)) },
  });

const encodeReauthenticationRequired = Schema.encodeSync(
  ReauthenticationRequired,
);

const DEFAULT_STATUS_CODES = new Map<number, string>([
  [400, "INVALID_REQUEST"],
  [401, "AUTHENTICATION_REQUIRED"],
  [403, "FORBIDDEN"],
  [404, "NOT_FOUND"],
  [409, "CONFLICT"],
  [410, "GONE"],
  [422, "INVALID_ENTITY"],
  [429, "RATE_LIMITED"],
  [503, "SERVICE_UNAVAILABLE"],
]);

/**
 * Answers a domain failure that carries its status and, optionally, its code.
 * A 401 always asks the caller to sign in again.
 */
export const statusCodeResponse = (error: {
  readonly status: number;
  readonly code?: string;
  readonly retryAfterMs?: number;
}) => {
  const code = error.code ?? DEFAULT_STATUS_CODES.get(error.status) ?? "ERROR";

  if (error.status === 401) {
    return reauthenticationRequiredResponse(
      new ReauthenticationRequired({ code, requiresReauth: true }),
    );
  }

  return Effect.succeed(
    httpErrorResponse(error.status, { code }, error.retryAfterMs),
  );
};

/**
 * HttpApi encodes a failure with the endpoint's own error schemas before the
 * bearer middleware's, so an empty or open endpoint error would claim this one.
 * Handlers answer it explicitly to keep the declared 401 body on every route.
 */
export const reauthenticationRequiredResponse = (
  error: ReauthenticationRequired,
) =>
  Effect.succeed(
    HttpServerResponse.jsonUnsafe(encodeReauthenticationRequired(error), {
      status: 401,
    }),
  );

export const pathString = (value: unknown, name: string) =>
  typeof value === "string"
    ? Effect.succeed(value)
    : Effect.die(new TypeError(`${name} path parameter must be a string`));

/** Preserve missing or non-string legacy route parameters for authorization to reject. */
export const optionalPathString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
