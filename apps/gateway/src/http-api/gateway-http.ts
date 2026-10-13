import { Permission } from "@lootlog/schema/permissions";
import { Effect, Layer, Struct } from "effect";
import { HttpRouter, HttpServer, HttpServerRequest } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import type { GatewayAuth } from "#src/auth/auth-service";
import type { GuildStore } from "#src/guilds/guild-store";
import type { PresenceStore } from "#src/realtime/presence-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import { hasPermission } from "#src/realtime/subscription-policy";
import { GatewayApi } from "./gateway-api.js";

export interface GatewayHttpDependencies {
  readonly hub: Pick<RealtimeHub, "unavailableReason">;
  readonly auth: Pick<GatewayAuth, "readIdentity">;
  readonly guilds: Pick<GuildStore, "getUserGuilds">;
  readonly presence: Pick<PresenceStore, "snapshot">;
}

export const ORGANIZATION_PRESENCE_ROUTE =
  "/organizations/:organizationId/presence";

export const isOrganizationPresencePath = (pathname: string) =>
  /^\/organizations\/[^/]+\/presence$/.test(pathname);

const unauthorized = { code: "UNAUTHORIZED" } as const;

const forbidden = { code: "FORBIDDEN" } as const;

const unavailable = { code: "UNAVAILABLE" } as const;

/**
 * Serves the `organization.presence` snapshot over HTTP with the subscription
 * policy a WebSocket viewer gets. API keys keep their lease checks on the
 * socket, so this read refuses them instead of re-implementing those checks.
 */
const readOrganizationPresence = Effect.fn("GatewayOrganizationPresence")(
  function* (
    dependencies: GatewayHttpDependencies,
    organizationId: string,
    world: string | undefined,
  ) {
    const request = yield* HttpServerRequest.HttpServerRequest;

    const identity = dependencies.auth.readIdentity({
      headers: new globalThis.Headers(request.headers),
    });

    if (!identity) return yield* Effect.fail(unauthorized);

    if (identity.apiKeyAccess) return yield* Effect.fail(forbidden);

    const guilds = yield* dependencies.guilds
      .getUserGuilds({ discordId: identity.discordId, userId: identity.userId })
      .pipe(Effect.mapError(() => unavailable));

    const viewer = { discordId: identity.discordId, guilds };

    if (
      !hasPermission(
        viewer,
        organizationId,
        Permission.LOOTLOG_ONLINE_PLAYERS_READ,
      )
    )
      return yield* Effect.fail(forbidden);

    const snapshot = yield* dependencies.presence
      .snapshot(viewer, organizationId, world)
      .pipe(Effect.mapError(() => unavailable));

    return {
      ...snapshot,
      presences: snapshot.presences.map((presence) =>
        Struct.omit(presence, ["discordId"]),
      ),
    };
  },
);

const makeGatewayHandlers = (dependencies: GatewayHttpDependencies) =>
  Layer.merge(
    HttpApiBuilder.group(GatewayApi, "health", (handlers) =>
      handlers
        .handle("GatewayHealth", () =>
          Effect.succeed({ status: "ok" as const }),
        )
        .handle("GatewayReadiness", () => {
          const reason = dependencies.hub.unavailableReason();

          return reason === undefined
            ? Effect.succeed({ status: "ready" as const })
            : Effect.fail({ status: "unavailable" as const, reason });
        }),
    ),
    HttpApiBuilder.group(GatewayApi, "presence", (handlers) =>
      handlers.handle("GatewayOrganizationPresence", ({ params, query }) =>
        readOrganizationPresence(
          dependencies,
          params.organizationId,
          query.world,
        ),
      ),
    ),
  );

export const makeGatewayHttpBoundary = (
  dependencies: GatewayHttpDependencies,
) =>
  HttpRouter.toWebHandler(
    HttpApiBuilder.layer(GatewayApi).pipe(
      Layer.provide(makeGatewayHandlers(dependencies)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );
