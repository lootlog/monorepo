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

/**
 * Forward-auth headers: the auth service asserts them for every request the
 * edge proxies, and the edge strips any copy a client sent. Services on the
 * private network trust them as the caller's identity.
 */
export const AUTH_USER_ID_HEADER = "x-auth-user-id";

export const AUTH_DISCORD_ID_HEADER = "x-auth-discord-id";

export const API_KEY_ACCESS_HEADER = "x-auth-api-key-access";

/** The developer credential the edge exchanges for forward-auth headers. */
export const API_KEY_HEADER = "x-api-key";

export const API_KEY_LEASE_MS = 60_000;

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

/** Auth's internal endpoint that the gateway polls to renew API key leases. */
export const API_KEY_STATUS_PATH = "/auth/internal/api-keys/status";

export const ApiKeyStatusRequest = Schema.Struct({
  keyIds: Schema.Array(Schema.NonEmptyString).check(Schema.isMaxLength(100)),
});

export const ApiKeyStatusResponse = Schema.Struct({
  keys: Schema.Array(ApiKeyStatus),
});
