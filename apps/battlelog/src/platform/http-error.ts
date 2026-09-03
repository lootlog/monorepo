import { Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

export const ApplicationErrorKind = {
  AUTHENTICATION_REQUIRED: "authentication-required",
  DEPENDENCY_UNAVAILABLE: "dependency-unavailable",
  FORBIDDEN: "forbidden",
  INVALID_REQUEST: "invalid-request",
  NOT_FOUND: "not-found",
} as const;
type ApplicationErrorKind =
  (typeof ApplicationErrorKind)[keyof typeof ApplicationErrorKind];

export class ApplicationError extends TaggedErrorClass<ApplicationError>()(
  "ApplicationError",
  {
    kind: Schema.Literals(Object.values(ApplicationErrorKind)),
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  constructor(
    readonly kind: ApplicationErrorKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super({ kind, message, cause: options?.cause });
  }
}

export class InvalidRequestError extends ApplicationError {
  constructor(message = "Bad Request", options?: ErrorOptions) {
    super(ApplicationErrorKind.INVALID_REQUEST, message, options);
  }
}

export class AuthenticationRequiredError extends ApplicationError {
  constructor(message = "Unauthorized", options?: ErrorOptions) {
    super(ApplicationErrorKind.AUTHENTICATION_REQUIRED, message, options);
  }
}

export class PermissionDeniedError extends ApplicationError {
  constructor(message = "Forbidden", options?: ErrorOptions) {
    super(ApplicationErrorKind.FORBIDDEN, message, options);
  }
}

export class ResourceNotFoundError extends ApplicationError {
  constructor(message = "Not Found", options?: ErrorOptions) {
    super(ApplicationErrorKind.NOT_FOUND, message, options);
  }
}

export class DependencyUnavailableError extends ApplicationError {
  constructor(message = "Service Unavailable", options?: ErrorOptions) {
    super(ApplicationErrorKind.DEPENDENCY_UNAVAILABLE, message, options);
  }
}

export const applicationErrorStatus = (error: ApplicationError): number => {
  switch (error.kind) {
    case ApplicationErrorKind.INVALID_REQUEST:
      return 400;
    case ApplicationErrorKind.AUTHENTICATION_REQUIRED:
      return 401;
    case ApplicationErrorKind.FORBIDDEN:
      return 403;
    case ApplicationErrorKind.NOT_FOUND:
      return 404;
    case ApplicationErrorKind.DEPENDENCY_UNAVAILABLE:
      return 503;
  }
};
