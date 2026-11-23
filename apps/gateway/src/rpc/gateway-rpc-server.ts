import { RpcForbiddenError, RpcUnavailableError } from "@lootlog/rpc/errors";
import { GatewayRpcGroup } from "@lootlog/rpc/gateway";
import { serviceRpcServer } from "@lootlog/rpc/server";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Layer } from "effect";
import { GatewayConfig } from "#src/config/gateway-config";
import { Guilds } from "#src/guilds/guild-store";
import { Presence } from "#src/realtime/presence-store";
import { hasPermission } from "#src/realtime/subscription-policy";

const GatewayRpcHandlers = GatewayRpcGroup.toLayer(
  Effect.gen(function* () {
    const guilds = yield* Guilds;
    const presence = yield* Presence;

    return GatewayRpcGroup.of({
      getOrganizationPresence: ({ userId, discordId, organizationId }) =>
        Effect.gen(function* () {
          const userGuilds = yield* guilds
            .getUserGuilds({ discordId, userId })
            .pipe(
              Effect.mapError(
                () =>
                  new RpcUnavailableError({
                    message: "Guild permissions unavailable",
                  }),
              ),
            );

          const viewer = { discordId, guilds: userGuilds };

          if (
            !hasPermission(
              viewer,
              organizationId,
              Permission.LOOTLOG_ONLINE_PLAYERS_READ,
            )
          ) {
            return yield* new RpcForbiddenError({
              message: "Missing permission to read organization presence",
            });
          }

          const snapshot = yield* presence
            .snapshot(viewer, organizationId, undefined)
            .pipe(
              Effect.mapError(
                () =>
                  new RpcUnavailableError({
                    message: "Presence snapshot unavailable",
                  }),
              ),
            );

          return {
            presences: snapshot.presences.map((entry) =>
              entry.character
                ? {
                    platform: entry.platform,
                    status: entry.status,
                    isAfk: entry.isAfk,
                    character: {
                      world: entry.character.world,
                      name: entry.character.name,
                    },
                  }
                : {
                    platform: entry.platform,
                    status: entry.status,
                    isAfk: entry.isAfk,
                  },
            ),
          };
        }),
    });
  }),
);

export const GatewayRpcServer = Layer.unwrap(
  Effect.map(GatewayConfig, ({ rpcPort }) =>
    serviceRpcServer({
      group: GatewayRpcGroup,
      handlers: GatewayRpcHandlers,
      port: rpcPort,
      spanPrefix: "gateway.rpc",
    }),
  ),
);
