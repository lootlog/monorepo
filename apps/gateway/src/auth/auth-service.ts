import {
  API_KEY_ACCESS_HEADER,
  API_KEY_LEASE_MS,
} from "@lootlog/schema/api-key-access";
import { readApiKeyAccess } from "@lootlog/schema/api-key-policy";
import { Redacted } from "effect";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import { GAME_URL_REGEX } from "#src/auth/game-url";
import type { AuthenticatedIdentity } from "#src/realtime/session";

export interface GatewayAuth {
  readonly getPlatform: (origin: string) => "game" | "web-app";
  readonly isAllowedOrigin: (origin: string | null) => boolean;
  readonly readIdentity: (request: Request) => AuthenticatedIdentity | null;
}

export const makeGatewayAuth = (
  config: Pick<
    GatewayConfiguration,
    "allowedWebOrigins" | "allowedExtensionOrigins"
  > &
    Partial<Pick<GatewayConfiguration, "authUrl" | "apiKeyStatusSecret">>,
): GatewayAuth => ({
  isAllowedOrigin: (origin) => {
    if (!origin) return false;
    const normalized = origin.replace(/\/$/, "");

    return (
      GAME_URL_REGEX.test(normalized) ||
      config.allowedWebOrigins.has(normalized) ||
      config.allowedExtensionOrigins.has(normalized)
    );
  },
  getPlatform: (origin) =>
    GAME_URL_REGEX.test(origin) ||
    config.allowedExtensionOrigins.has(origin.replace(/\/$/, ""))
      ? "game"
      : "web-app",
  // Only the private reverse proxy may supply these verified identity headers.
  readIdentity: (request) => {
    const userId = request.headers.get("x-auth-user-id")?.trim();
    const discordId = request.headers.get("x-auth-discord-id")?.trim();

    if (!userId || !discordId) return null;

    const access = readApiKeyAccess({
      [API_KEY_ACCESS_HEADER]:
        request.headers.get(API_KEY_ACCESS_HEADER) ?? undefined,
    });

    if (access === null) return null;

    if (access === undefined) {
      if (request.headers.has("x-api-key")) return null;

      return { userId, discordId };
    }

    if (
      !config.authUrl ||
      !config.apiKeyStatusSecret ||
      !Redacted.value(config.apiKeyStatusSecret)
    )
      return null;

    if (
      access.expiresAt !== null &&
      !(Date.parse(access.expiresAt) > Date.now())
    )
      return null;

    return {
      userId,
      discordId,
      apiKeyAccess: access,
      apiKeyLeaseExpiresAt: Date.now() + API_KEY_LEASE_MS,
    };
  },
});
