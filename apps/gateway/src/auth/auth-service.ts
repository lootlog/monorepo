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
  >,
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
    return userId && discordId ? { userId, discordId } : null;
  },
});
