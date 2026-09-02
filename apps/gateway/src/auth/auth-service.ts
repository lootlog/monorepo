import type { GatewayConfiguration } from "#src/config/gateway-config";
import { GAME_URL_REGEX } from "#src/gateway/constants/game-url-regex.constant";
import type { AuthenticatedIdentity } from "#src/realtime/session";

const REQUEST_TIMEOUT_MS = 10_000;
const TICKET_PROTOCOL_PREFIX = "lootlog.ticket.v1.";

const readTicketProtocol = (header: string | null): string | null => {
  const protocol = header
    ?.split(",")
    .map((value) => value.trim())
    .find((value) => value.startsWith(TICKET_PROTOCOL_PREFIX));
  if (!protocol) return null;
  const encoded = protocol.slice(TICKET_PROTOCOL_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    const value = Buffer.from(encoded, "base64url").toString("utf8").trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
};

export type UpgradeCredential =
  | { readonly kind: "session-cookie"; readonly value: string }
  | {
      readonly kind: "one-time-ticket";
      readonly value: string;
      readonly origin: string;
    };

export interface UpgradeTicketVerifier {
  readonly verify: (
    credential: UpgradeCredential,
  ) => Promise<AuthenticatedIdentity | null>;
}

const readIdentity = (response: Response): AuthenticatedIdentity | null => {
  const discordId = response.headers.get("x-auth-discord-id")?.trim();
  const userId = response.headers.get("x-auth-user-id")?.trim();
  if (!response.ok || !discordId || !userId) return null;
  return { discordId, userId };
};

export class AuthService implements UpgradeTicketVerifier {
  constructor(private readonly config: GatewayConfiguration) {}

  isAllowedOrigin(origin: string | null): boolean {
    if (!origin) return false;
    const normalized = origin.replace(/\/$/, "");
    return (
      GAME_URL_REGEX.test(normalized) ||
      this.config.allowedWebOrigins.has(normalized)
    );
  }

  getPlatform(origin: string): "game" | "web-app" {
    return GAME_URL_REGEX.test(origin) ? "game" : "web-app";
  }

  readCredential(request: Request): UpgradeCredential | null {
    const protocolTicket = readTicketProtocol(
      request.headers.get("sec-websocket-protocol"),
    );
    if (protocolTicket) {
      const origin = request.headers.get("origin")?.trim();
      return origin
        ? { kind: "one-time-ticket", value: protocolTicket, origin }
        : null;
    }

    const cookie = request.headers.get("cookie")?.trim();
    if (cookie) return { kind: "session-cookie", value: cookie };

    const authorization = request.headers.get("authorization")?.trim();
    if (!authorization?.startsWith("Bearer ")) return null;
    const ticket = authorization.slice("Bearer ".length).trim();
    const origin = request.headers.get("origin")?.trim();
    return ticket.length > 0 && origin
      ? { kind: "one-time-ticket", value: ticket, origin }
      : null;
  }

  async verify(
    credential: UpgradeCredential,
  ): Promise<AuthenticatedIdentity | null> {
    const headers = new Headers();
    if (credential.kind === "session-cookie") {
      headers.set("cookie", credential.value);
    } else {
      headers.set("authorization", `Bearer ${credential.value}`);
      headers.set("x-lootlog-credential-purpose", "websocket-ticket");
      headers.set("x-lootlog-websocket-origin", credential.origin);
    }

    try {
      const response = await fetch(`${this.config.authUrl}/auth/verify`, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return readIdentity(response);
    } catch {
      return null;
    }
  }
}
