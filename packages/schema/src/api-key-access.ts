import { Schema } from "effect";

export const ApiKeyGrant = Schema.Struct({
  organizationIds: Schema.Array(
    Schema.String.check(Schema.isPattern(/^\d{1,20}$/u)),
  ).check(Schema.isMaxLength(100)),
  mode: Schema.Literals(["read", "read-write"]),
  personalData: Schema.Boolean,
});

export type ApiKeyGrant = typeof ApiKeyGrant.Type;

export const ApiKeyAccess = Schema.Struct({
  ...ApiKeyGrant.fields,
  keyId: Schema.NonEmptyString,
  expiresAt: Schema.NullOr(Schema.String),
});

export type ApiKeyAccess = typeof ApiKeyAccess.Type;

export const AUTH_USER_ID_HEADER = "x-auth-user-id";

export const AUTH_DISCORD_ID_HEADER = "x-auth-discord-id";

export const API_KEY_ACCESS_HEADER = "x-auth-api-key-access";

export const API_KEY_HEADER = "x-api-key";

export const API_KEY_LEASE_MS = 60_000;

export const API_KEY_ERRORS = {
  disabled: { code: "API_KEYS_DISABLED", message: "API keys are disabled" },
  organizationServiceUnavailable: {
    code: "ORGANIZATION_SERVICE_UNAVAILABLE",
    message: "Organization service unavailable",
  },
  organizationAccessRequired: {
    code: "ORGANIZATION_ACCESS_REQUIRED",
    message: "Organization access required",
  },
  limitReached: {
    code: "API_KEY_LIMIT_REACHED",
    message: "Maximum active API keys reached",
  },
  sessionRequired: { code: "SESSION_REQUIRED", message: "Session required" },
  creationFailed: {
    code: "API_KEY_CREATION_FAILED",
    message: "API key creation failed",
  },
} as const;

export const ApiKeyStatus = Schema.Union([
  Schema.Struct({ keyId: Schema.NonEmptyString, valid: Schema.Literal(false) }),
  Schema.Struct({
    keyId: Schema.NonEmptyString,
    valid: Schema.Literal(true),
    access: ApiKeyAccess,
    userId: Schema.NonEmptyString,
    discordId: Schema.NonEmptyString,
  }),
]);

export type ApiKeyStatus = typeof ApiKeyStatus.Type;

export const ApiKeyStatusRequest = Schema.Struct({
  keyIds: Schema.Array(Schema.NonEmptyString).check(Schema.isMaxLength(100)),
});

export const ApiKeyStatusResponse = Schema.Struct({
  keys: Schema.Array(ApiKeyStatus),
});
