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

export const API_KEY_ACCESS_HEADER = "x-auth-api-key-access";

export const API_KEY_LEASE_MS = 60_000;

/**
 * Messages the auth service answers API key management failures with; the
 * developer portal shows its own copy for each of them.
 */
export const API_KEY_ERROR_MESSAGES = {
  disabled: "API keys are disabled",
  organizationServiceUnavailable: "Organization service unavailable",
  organizationAccessRequired: "Organization access required",
  limitReached: "Maximum active API keys reached",
  sessionRequired: "Session required",
  creationFailed: "API key creation failed",
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
