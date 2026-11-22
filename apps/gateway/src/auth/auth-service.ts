import {
  API_KEY_ACCESS_HEADER,
  API_KEY_HEADER,
  API_KEY_LEASE_MS,
  AUTH_DISCORD_ID_HEADER,
  AUTH_USER_ID_HEADER,
} from "@lootlog/schema/api-key-access";
import { readForwardAuthIdentity } from "@lootlog/schema/api-key-policy";
import { Redacted, Context, Effect, Layer } from "effect";
import {
  type GatewayConfiguration,
  GatewayConfig,
} from "#src/config/gateway-config";
import { GAME_URL_REGEX } from "#src/auth/game-url";
import type { AuthenticatedIdentity } from "#src/realtime/session";

export interface GatewayAuth {
  readonly getPlatform: (origin: string) => "game" | "web-app";
  readonly isAllowedOrigin: (origin: string | null) => boolean;
  readonly readIdentity: (
    request: Pick<Request, "headers">,
  ) => AuthenticatedIdentity | null;
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
  readIdentity: (request) => {
    const identity = readForwardAuthIdentity(
      Object.fromEntries(
        [
          AUTH_USER_ID_HEADER,
          AUTH_DISCORD_ID_HEADER,
          API_KEY_ACCESS_HEADER,
        ].map((name) => [name, request.headers.get(name) ?? undefined]),
      ),
    );

    if (!identity) return null;
    const { userId, discordId, apiKey: access } = identity;

    if (access === undefined) {
      if (request.headers.has(API_KEY_HEADER)) return null;

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

export class Auth extends Context.Service<Auth, GatewayAuth>()(
  "@lootlog/gateway/auth/Auth",
) {
  static readonly layer = Layer.effect(
    Auth,
    Effect.map(GatewayConfig, makeGatewayAuth),
  );
}
