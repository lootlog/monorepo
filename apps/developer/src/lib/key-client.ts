import {
  type ApiKeysCreateApiKeyBody,
  ApiKeysCreateApiKeyBodyExpiresIn,
  type ApiKeysListApiKeys200KeysItem,
} from "@lootlog/client/auth";
import { getApiErrorStringField } from "@lootlog/client/transport";
import { API_KEY_ERRORS } from "@lootlog/schema/api-key-access";
import { Schema } from "effect";
import { portalText as t } from "./translations";

export type ApiKey = ApiKeysListApiKeys200KeysItem;

const keyErrorCopy = [
  [API_KEY_ERRORS.disabled, t.keysDisabled],
  [
    API_KEY_ERRORS.organizationServiceUnavailable,
    t.organizationServiceUnavailable,
  ],
  [API_KEY_ERRORS.organizationAccessRequired, t.organizationAccessRequired],
  [API_KEY_ERRORS.limitReached, t.keyLimit],
  [API_KEY_ERRORS.sessionRequired, t.keySessionRequired],
  [API_KEY_ERRORS.creationFailed, t.keyCreationFailed],
] as const;

export function getKeyErrorMessage(cause: unknown) {
  const code = getApiErrorStringField(cause, "code");

  return keyErrorCopy.find(([reason]) => reason.code === code)?.[1] ?? t.error;
}

const EXPIRY_BY_DAYS = {
  "30": ApiKeysCreateApiKeyBodyExpiresIn.NUMBER_2592000,
  "90": ApiKeysCreateApiKeyBodyExpiresIn.NUMBER_7776000,
  "365": ApiKeysCreateApiKeyBodyExpiresIn.NUMBER_31536000,
  never: null,
} as const;

const KeyForm = Schema.Struct({
  name: Schema.String,
  organizationIds: Schema.Array(Schema.String),
  personalData: Schema.Boolean,
  mode: Schema.Literals(["read", "read-write"]),
  expiresIn: Schema.Literals(["30", "90", "365", "never"]),
});

const decodeKeyForm = Schema.decodeUnknownSync(KeyForm);

export function readKeyForm(data: FormData): ApiKeysCreateApiKeyBody {
  const form = decodeKeyForm({
    name: data.get("name"),
    organizationIds: data.getAll("organizationIds"),
    personalData: data.has("personalData"),
    mode: data.get("mode"),
    expiresIn: data.get("expiresIn"),
  });

  return {
    name: form.name,
    organizationIds: [...form.organizationIds],
    personalData: form.personalData,
    mode: form.mode,
    expiresIn: EXPIRY_BY_DAYS[form.expiresIn],
  };
}

export function isApiKeyActive(
  key: Pick<ApiKey, "expiresAt">,
  observedAt: number,
): boolean {
  return key.expiresAt === null || Date.parse(key.expiresAt) > observedAt;
}
