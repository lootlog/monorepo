import { Effect, Schema } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import { GAME_URL_REGEX } from "#src/gateway/constants/game-url-regex.constant";
import type { AuthenticatedIdentity } from "#src/realtime/session";

const ticketProtocolPrefix = "lootlog.ticket.v1.";

const readTicketProtocol = (header: string | null): string | null => {
  const protocol = header
    ?.split(",")
    .map((value) => value.trim())
    .find((value) => value.startsWith(ticketProtocolPrefix));
  if (!protocol) return null;
  const encoded = protocol.slice(ticketProtocolPrefix.length);
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

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class GatewayAuthFailure extends Schema.TaggedError<GatewayAuthFailure>()(
  "GatewayAuthFailure",
  { reason: Schema.Literals(["timeout", "transport"]) },
) {}

export interface GatewayAuth {
  readonly getPlatform: (origin: string) => "game" | "web-app";
  readonly isAllowedOrigin: (origin: string | null) => boolean;
  readonly readCredential: (request: Request) => UpgradeCredential | null;
  readonly verify: (
    credential: UpgradeCredential,
  ) => Effect.Effect<AuthenticatedIdentity | null>;
}

export const makeGatewayAuth = (
  config: GatewayConfiguration,
  httpClient: HttpClientValue,
): GatewayAuth => {
  const isAllowedOrigin = (origin: string | null) => {
    if (!origin) return false;
    const normalized = origin.replace(/\/$/, "");
    return (
      GAME_URL_REGEX.test(normalized) ||
      config.allowedWebOrigins.has(normalized)
    );
  };

  const getPlatform = (origin: string): "game" | "web-app" =>
    GAME_URL_REGEX.test(origin) ? "game" : "web-app";

  const readCredential = (request: Request): UpgradeCredential | null => {
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
  };

  const verify = Effect.fn("GatewayAuth_verify")(function* (
    credential: UpgradeCredential,
  ) {
    const headers =
      credential.kind === "session-cookie"
        ? { cookie: credential.value }
        : {
            authorization: `Bearer ${credential.value}`,
            "x-lootlog-credential-purpose": "websocket-ticket",
            "x-lootlog-websocket-origin": credential.origin,
          };
    const response = yield* httpClient
      .get(`${config.authUrl}/auth/verify`, { headers })
      .pipe(
        Effect.timeout("10 seconds"),
        Effect.mapError(
          (error) =>
            new GatewayAuthFailure({
              reason: error._tag === "TimeoutError" ? "timeout" : "transport",
            }),
        ),
      );
    const discordId = response.headers["x-auth-discord-id"]?.trim();
    const userId = response.headers["x-auth-user-id"]?.trim();
    return response.status >= 200 &&
      response.status < 300 &&
      discordId &&
      userId
      ? { discordId, userId }
      : null;
  });

  return {
    getPlatform,
    isAllowedOrigin,
    readCredential,
    verify: (credential) =>
      verify(credential).pipe(
        Effect.catch(() => Effect.succeed(null)),
        Effect.withSpan("GatewayAuth_verify", {
          attributes: { adapter: "auth", retryCount: 0 },
        }),
      ),
  };
};
