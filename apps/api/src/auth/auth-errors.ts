import { Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

export class AccountNotFoundError extends TaggedErrorClass<AccountNotFoundError>()(
  "AccountNotFoundError",
  {},
) {
  override get message() {
    return "User account not found";
  }
}

export class AuthBadRequestError extends TaggedErrorClass<AuthBadRequestError>()(
  "AuthBadRequestError",
  { message: Schema.String },
) {}

export class AuthServiceUnavailableError extends TaggedErrorClass<AuthServiceUnavailableError>()(
  "AuthServiceUnavailableError",
  { message: Schema.String },
) {}

export class DiscordTokenRejectedError extends TaggedErrorClass<DiscordTokenRejectedError>()(
  "DiscordTokenRejectedError",
  {},
) {
  override get message() {
    return "Discord rejected the IDP token";
  }
}

export class InvalidScopesError extends TaggedErrorClass<InvalidScopesError>()(
  "InvalidScopesError",
  {
    required: Schema.Array(Schema.String),
    actual: Schema.Array(Schema.String),
  },
) {
  override get message() {
    return `Missing required scopes: ${this.required.join(", ")}`;
  }
}

export class TokenExpiredError extends TaggedErrorClass<TokenExpiredError>()(
  "TokenExpiredError",
  {},
) {
  override get message() {
    return "IDP token has expired";
  }
}

export type AuthServiceError =
  | AccountNotFoundError
  | AuthBadRequestError
  | AuthServiceUnavailableError
  | DiscordTokenRejectedError
  | InvalidScopesError
  | TokenExpiredError;
