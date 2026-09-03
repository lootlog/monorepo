import { Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

type ApplicationErrorBody = string | Readonly<Record<string, unknown>>;

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

const defaultBody = (status: number): ApplicationErrorBody => ({
  statusCode: status,
});

const errorMessage = (
  response: ApplicationErrorBody,
  fallback: string,
): string => {
  if (typeof response === "string") return response;
  if (typeof response.message === "string") return response.message;
  return fallback;
};

export class ApplicationError extends TaggedErrorClass<ApplicationError>()(
  "ApplicationError",
  {
    kind: Schema.Literals(Object.values(ApplicationErrorKind)),
    message: Schema.String,
    response: Schema.Unknown,
  },
) {
  constructor(
    kind: ApplicationErrorKind,
    response: ApplicationErrorBody,
    fallbackMessage: string,
  ) {
    super({
      kind,
      response,
      message: errorMessage(response, fallbackMessage),
    });
  }

  getResponse(): ApplicationErrorBody {
    return this.response as ApplicationErrorBody;
  }
}

const makeApplicationError = (
  kind: ApplicationErrorKind,
  fallbackMessage: string,
  defaultStatus: number,
) =>
  class extends ApplicationError {
    constructor(response: ApplicationErrorBody = defaultBody(defaultStatus)) {
      super(kind, response, fallbackMessage);
    }
  };

export class InvalidRequestError extends makeApplicationError(
  ApplicationErrorKind.INVALID_REQUEST,
  "Invalid request",
  HttpStatus.BAD_REQUEST,
) {}
export class AuthenticationRequiredError extends makeApplicationError(
  ApplicationErrorKind.AUTHENTICATION_REQUIRED,
  "Authentication required",
  HttpStatus.UNAUTHORIZED,
) {}
export class PermissionDeniedError extends makeApplicationError(
  ApplicationErrorKind.FORBIDDEN,
  "Permission denied",
  HttpStatus.FORBIDDEN,
) {}
export class ResourceNotFoundError extends makeApplicationError(
  ApplicationErrorKind.NOT_FOUND,
  "Resource not found",
  HttpStatus.NOT_FOUND,
) {}
export class ResourceConflictError extends makeApplicationError(
  ApplicationErrorKind.CONFLICT,
  "Resource conflict",
  HttpStatus.CONFLICT,
) {}
export class ResourceGoneError extends makeApplicationError(
  ApplicationErrorKind.GONE,
  "Resource is gone",
  HttpStatus.GONE,
) {}
export class InvalidEntityError extends makeApplicationError(
  ApplicationErrorKind.INVALID_ENTITY,
  "Invalid entity",
  HttpStatus.UNPROCESSABLE_ENTITY,
) {}
export class RequestTimeoutError extends makeApplicationError(
  ApplicationErrorKind.TIMEOUT,
  "Request timed out",
  HttpStatus.REQUEST_TIMEOUT,
) {}
export class RateLimitedError extends makeApplicationError(
  ApplicationErrorKind.RATE_LIMITED,
  "Request rate limited",
  HttpStatus.TOO_MANY_REQUESTS,
) {}
export class DependencyUnavailableError extends makeApplicationError(
  ApplicationErrorKind.DEPENDENCY_UNAVAILABLE,
  "Dependency unavailable",
  HttpStatus.SERVICE_UNAVAILABLE,
) {}
export class UnexpectedApplicationError extends makeApplicationError(
  ApplicationErrorKind.INTERNAL,
  "Unexpected application error",
  HttpStatus.INTERNAL_SERVER_ERROR,
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
  error instanceof ApplicationError ? applicationErrorStatus(error) : undefined;
