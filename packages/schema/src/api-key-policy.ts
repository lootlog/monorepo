import { Option, Schema } from "effect";
import {
  API_KEY_ACCESS_HEADER,
  AUTH_DISCORD_ID_HEADER,
  AUTH_USER_ID_HEADER,
  ApiKeyAccess,
} from "./api-key-access.js";
import { getPublicApiOperation } from "./public-api-policy.js";

const decodeAccess = Schema.decodeUnknownOption(
  Schema.fromJsonString(ApiKeyAccess),
);

/** Undefined means a session; null means a malformed proxy assertion and must fail closed. */
export function readApiKeyAccess(
  headers: Readonly<Record<string, string | undefined>>,
): ApiKeyAccess | null | undefined {
  const value = headers[API_KEY_ACCESS_HEADER];

  if (value === undefined || value === "") return undefined;
  const decoded = decodeAccess(value);

  return Option.isSome(decoded) ? decoded.value : null;
}

export interface ForwardAuthIdentityValue {
  readonly userId: string;
  readonly discordId: string;
  readonly apiKey?: ApiKeyAccess;
}

/** The caller the edge asserted, or undefined when the assertion is missing or malformed. */
export function readForwardAuthIdentity(
  headers: Readonly<Record<string, string | undefined>>,
): ForwardAuthIdentityValue | undefined {
  const userId = headers[AUTH_USER_ID_HEADER]?.trim();
  const discordId = headers[AUTH_DISCORD_ID_HEADER]?.trim();

  if (!userId || !discordId) return undefined;
  const apiKey = readApiKeyAccess(headers);

  if (apiKey === null) return undefined;

  return apiKey === undefined
    ? { userId, discordId }
    : { userId, discordId, apiKey };
}

export function apiKeyAllowsOperation(
  access: ApiKeyAccess,
  service: string,
  operationId: string,
): boolean {
  const operation = getPublicApiOperation(service, operationId);

  if (!operation || operation.access === "session-only") return false;

  if (operation.access === "write" && access.mode !== "read-write")
    return false;

  if (operation.data === "personal" && !access.personalData) return false;

  if (access.expiresAt !== null) {
    const expiresAt = Date.parse(access.expiresAt);

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  }

  return true;
}

export function apiKeyAllowsOrganization(
  access: ApiKeyAccess | undefined,
  organizationId: string,
): boolean {
  return (
    access === undefined || access.organizationIds.includes(organizationId)
  );
}
