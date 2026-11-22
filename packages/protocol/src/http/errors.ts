import { Effect, Predicate, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { HttpServerResponse } from "effect/http";
import { JsonValue } from "@lootlog/schema/http-scalars";

/**
 * Body of every Lootlog service's 4xx/5xx response, except the 401 that asks
 * for sign-in again (`ReauthenticationRequired`). `code` is the stable, machine-readable reason
 * (`NOT_FOUND`, `VALIDATION_ERROR`, `RESERVATION_OVERLAP`); `message` is for
 * people and may change; `details` holds the values a client needs to explain
 * the reason. A 429 also sends `Retry-After` in seconds when the wait is known.
 */
export const HttpErrorResponse = Schema.Struct({
  code: Schema.String,
  message: Schema.optional(Schema.String),
  details: Schema.optional(Schema.Record(Schema.String, JsonValue)),
}).annotate({ identifier: "HttpErrorResponse" });

export type HttpErrorResponse = typeof HttpErrorResponse.Type;

/**
 * The caller's Discord authorization no longer works, so Lootlog cannot resolve
 * their identity or Organization membership. `requiresReauth` starts the Web
 * app's sign-in flow; `code` names the failed step, such as
 * `DISCORD_UNAUTHORIZED` or `IDP_REAUTH_REQUIRED`.
 */
export class ReauthenticationRequired extends TaggedErrorClass<
  ReauthenticationRequired,
  { readonly brand: unique symbol }
>()(
  "ReauthenticationRequired",
  { code: Schema.String, requiresReauth: Schema.Literal(true) },
  { httpApiStatus: 401 },
) {}

export const HttpStatus = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  GONE: 410,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ApplicationErrorKind = {
  AUTHENTICATION_REQUIRED: "authentication-required",
  CONFLICT: "conflict",
  DEPENDENCY_UNAVAILABLE: "dependency-unavailable",
  FORBIDDEN: "forbidden",
  GONE: "gone",
  INTERNAL: "internal",
  INVALID_ENTITY: "invalid-entity",
  INVALID_REQUEST: "invalid-request",
  NOT_FOUND: "not-found",
  RATE_LIMITED: "rate-limited",
  TIMEOUT: "timeout",
} as const;

export type ApplicationErrorKind =
  (typeof ApplicationErrorKind)[keyof typeof ApplicationErrorKind];

/**
 * What a handler may put in an HTTP error body. A plain string is a
 * human-readable `message`; machine-readable reasons go in `code`.
 */
export type ApplicationErrorInput =
  | string
  | {
      readonly code?: string;
      readonly message?: string;
      readonly details?: Readonly<Record<string, typeof JsonValue.Type>>;
      /** Sent as the `Retry-After` header, rounded up to whole seconds. */
      readonly retryAfterMs?: number;
    };

export class ApplicationError extends TaggedErrorClass<
  ApplicationError,
  { readonly brand: unique symbol }
>()("ApplicationError", {
  kind: Schema.Literals(Object.values(ApplicationErrorKind)),
  message: Schema.String,
  body: HttpErrorResponse,
  retryAfterMs: Schema.optional(Schema.Finite),
}) {
  constructor(
    kind: ApplicationErrorKind,
    input: ApplicationErrorInput,
    defaultCode: string,
    fallbackMessage: string,
  ) {
    const fields = Predicate.isString(input) ? { message: input } : input;

    const hasDetails =
      fields.details !== undefined && Object.keys(fields.details).length > 0;

    super({
      kind,
      body: {
        code: fields.code ?? defaultCode,
        message: fields.message,
        details: hasDetails ? fields.details : undefined,
      },
      message: fields.message ?? fields.code ?? fallbackMessage,
      retryAfterMs: fields.retryAfterMs,
    });
  }
}

const makeApplicationError = (
  kind: ApplicationErrorKind,
  defaultCode: string,
  fallbackMessage: string,
): new (input?: ApplicationErrorInput) => ApplicationError =>
  class extends ApplicationError {
    constructor(input: ApplicationErrorInput = {}) {
      super(kind, input, defaultCode, fallbackMessage);
    }
  };

export class InvalidRequestError extends makeApplicationError(
  ApplicationErrorKind.INVALID_REQUEST,
  "INVALID_REQUEST",
  "Invalid request",
) {}

export class AuthenticationRequiredError extends makeApplicationError(
  ApplicationErrorKind.AUTHENTICATION_REQUIRED,
  "AUTHENTICATION_REQUIRED",
  "Authentication required",
) {}

export class PermissionDeniedError extends makeApplicationError(
  ApplicationErrorKind.FORBIDDEN,
  "FORBIDDEN",
  "Permission denied",
) {}

export class ResourceNotFoundError extends makeApplicationError(
  ApplicationErrorKind.NOT_FOUND,
  "NOT_FOUND",
  "Resource not found",
) {}

export class ResourceConflictError extends makeApplicationError(
  ApplicationErrorKind.CONFLICT,
  "CONFLICT",
  "Resource conflict",
) {}

export class ResourceGoneError extends makeApplicationError(
  ApplicationErrorKind.GONE,
  "GONE",
  "Resource is gone",
) {}

export class InvalidEntityError extends makeApplicationError(
  ApplicationErrorKind.INVALID_ENTITY,
  "INVALID_ENTITY",
  "Invalid entity",
) {}

export class RequestTimeoutError extends makeApplicationError(
  ApplicationErrorKind.TIMEOUT,
  "TIMEOUT",
  "Request timed out",
) {}

export class RateLimitedError extends makeApplicationError(
  ApplicationErrorKind.RATE_LIMITED,
  "RATE_LIMITED",
  "Request rate limited",
) {}

export class DependencyUnavailableError extends makeApplicationError(
  ApplicationErrorKind.DEPENDENCY_UNAVAILABLE,
  "SERVICE_UNAVAILABLE",
  "Dependency unavailable",
) {}

export class UnexpectedApplicationError extends makeApplicationError(
  ApplicationErrorKind.INTERNAL,
  "INTERNAL",
  "Unexpected application error",
) {}

export const applicationErrorStatus = (error: ApplicationError): number => {
  switch (error.kind) {
    case ApplicationErrorKind.INVALID_REQUEST:
      return HttpStatus.BAD_REQUEST;
    case ApplicationErrorKind.AUTHENTICATION_REQUIRED:
      return HttpStatus.UNAUTHORIZED;
    case ApplicationErrorKind.FORBIDDEN:
      return HttpStatus.FORBIDDEN;
    case ApplicationErrorKind.NOT_FOUND:
      return HttpStatus.NOT_FOUND;
    case ApplicationErrorKind.CONFLICT:
      return HttpStatus.CONFLICT;
    case ApplicationErrorKind.GONE:
      return HttpStatus.GONE;
    case ApplicationErrorKind.INVALID_ENTITY:
      return HttpStatus.UNPROCESSABLE_ENTITY;
    case ApplicationErrorKind.TIMEOUT:
      return HttpStatus.REQUEST_TIMEOUT;
    case ApplicationErrorKind.RATE_LIMITED:
      return HttpStatus.TOO_MANY_REQUESTS;
    case ApplicationErrorKind.DEPENDENCY_UNAVAILABLE:
      return HttpStatus.SERVICE_UNAVAILABLE;
    case ApplicationErrorKind.INTERNAL:
      return HttpStatus.INTERNAL_SERVER_ERROR;
  }
};

export const applicationErrorStatusOrUndefined = (
  error: unknown,
): number | undefined =>
  Schema.is(ApplicationError)(error)
    ? applicationErrorStatus(error)
    : undefined;

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

/**
 * Answers an `ApplicationError` with its status and body. Anything else, and
 * an internal error, is a defect the server logs and answers with a 500; a
 * dependency failure hides its message behind "Service unavailable".
 *
 * Handlers answer explicitly because every declared error status shares the
 * `HttpErrorResponse` schema, so a failure value cannot select its status.
 */
export const applicationErrorHttpResponse = (cause: unknown) => {
  if (!Schema.is(ApplicationError)(cause)) return Effect.die(cause);
  const status = applicationErrorStatus(cause);

  if (status === HttpStatus.INTERNAL_SERVER_ERROR) return Effect.die(cause);

  if (status >= 500) {
    return Effect.succeed(
      httpErrorResponse(
        status,
        { code: cause.body.code, message: "Service unavailable" },
        cause.retryAfterMs,
      ),
    );
  }

  return Effect.succeed(
    httpErrorResponse(status, cause.body, cause.retryAfterMs),
  );
};

const encodeReauthenticationRequired = Schema.encodeSync(
  ReauthenticationRequired,
);

/**
 * Answers `ReauthenticationRequired` with its declared 401 body. HttpApi
 * encodes a failure with the first error schema that accepts it, and an open
 * `HttpErrorResponse` 401 would claim this one and drop `requiresReauth`, so
 * handlers answer it explicitly.
 */
export const reauthenticationRequiredResponse = (
  error: ReauthenticationRequired,
) =>
  Effect.succeed(
    HttpServerResponse.jsonUnsafe(encodeReauthenticationRequired(error), {
      status: HttpStatus.UNAUTHORIZED,
    }),
  );
