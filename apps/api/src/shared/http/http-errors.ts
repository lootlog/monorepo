import { Predicate, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  HttpErrorResponse,
  type JsonValue,
} from "#src/http-api/contracts/shared";

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
      readonly details?: Readonly<Record<string, JsonValue>>;
      /** Sent as the `Retry-After` header, rounded up to whole seconds. */
      readonly retryAfterMs?: number;
    };

export class ApplicationError extends TaggedErrorClass<ApplicationError>()(
  "ApplicationError",
  {
    kind: Schema.Literals(Object.values(ApplicationErrorKind)),
    message: Schema.String,
    body: HttpErrorResponse,
    retryAfterMs: Schema.optional(Schema.Number),
  },
) {
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
) =>
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
