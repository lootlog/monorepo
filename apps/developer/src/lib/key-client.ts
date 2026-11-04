import { DateTimeString } from "@lootlog/schema/http-scalars";
import { Option, Schema } from "effect";
import { portalText as t } from "./translations";
import { getPortalEnvironment } from "./environment";

const keyFields = {
  id: Schema.String,
  name: Schema.String,
  start: Schema.NullOr(Schema.String),
  createdAt: DateTimeString,
  expiresAt: Schema.NullOr(DateTimeString),
  organizationIds: Schema.Array(Schema.String),
  mode: Schema.Literals(["read", "read-write"]),
  personalData: Schema.Boolean,
};

const Key = Schema.Struct(keyFields);

export type ApiKey = typeof Key.Type;

export const decodeKeyList = Schema.decodeUnknownSync(
  Schema.Struct({ keys: Schema.Array(Key) }),
);

export const decodeCreatedKey = Schema.decodeUnknownSync(
  Schema.Struct({ ...keyFields, key: Schema.String }),
);

export const decodeOrganizations = Schema.decodeUnknownSync(
  Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
);

const decodeErrorBody = Schema.decodeUnknownOption(
  Schema.Struct({ message: Schema.String }),
);

const keyErrorMessages = new Map([
  ["API keys are disabled", t.keysDisabled],
  ["Organization service unavailable", t.organizationServiceUnavailable],
  ["Organization access required", t.organizationAccessRequired],
  ["Maximum active API keys reached", t.keyLimit],
  ["Session required", t.keySessionRequired],
  ["API key creation failed", t.keyCreationFailed],
]);

class KeyRequestError extends Error {}

export function getKeyErrorMessage(cause: unknown) {
  return cause instanceof KeyRequestError ? cause.message : t.error;
}

export async function keyRequest(path = "", init?: RequestInit) {
  const response = await fetch(
    `${getPortalEnvironment(location.hostname).auth}/auth/api-keys${path}`,
    {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const parsed = decodeErrorBody(body);
    throw new KeyRequestError(
      Option.isSome(parsed)
        ? (keyErrorMessages.get(parsed.value.message) ?? t.error)
        : t.error,
    );
  }

  const result: unknown = await response.json();

  return result;
}

export function isApiKeyActive(
  key: Pick<ApiKey, "expiresAt">,
  observedAt: number,
): boolean {
  return key.expiresAt === null || Date.parse(key.expiresAt) > observedAt;
}
