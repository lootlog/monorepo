import {
  ApiRpcGroup,
  RpcAccessibleGuild,
  RpcEventRankingEntry,
  RpcEventSummary,
  RpcEventTimer,
  RpcEventWrapped,
  RpcGuildKillStats,
  RpcGuildLootPage,
  RpcGuildLookup,
  RpcGuildTimer,
  RpcNpcKillers,
  RpcReservationPage,
  RpcReservationSpot,
  RpcTopKilledNpcs,
} from "@lootlog/rpc/api";
import {
  RpcForbiddenError,
  RpcNotFoundError,
  RpcUnauthorizedError,
  RpcUnavailableError,
} from "@lootlog/rpc/errors";
import { serviceRpcServer } from "@lootlog/rpc/server";
import {
  AUTH_DISCORD_ID_HEADER,
  AUTH_USER_ID_HEADER,
} from "@lootlog/schema/api-key-access";
import { InternalMemberIdentityResponse } from "@lootlog/schema/internal-guilds";
import { UserGuildPermissionsDtoSchema } from "@lootlog/schema/permissions";
import { Effect, Layer, Schema } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { InternalGuildsData } from "#src/guilds/internal-guilds-data";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

const UserPermissionsList = Schema.Array(UserGuildPermissionsDtoSchema);

const AccessibleGuildsList = Schema.Array(RpcAccessibleGuild);

const EventsList = Schema.Array(RpcEventSummary);

const EventRankingList = Schema.Array(RpcEventRankingEntry);

const EventTimersList = Schema.Array(RpcEventTimer);

const GuildTimersList = Schema.Array(RpcGuildTimer);

const ReservationSpotsList = Schema.Array(RpcReservationSpot);

type QueryValue = string | number | boolean | ReadonlyArray<string> | undefined;

const buildInternalUrl = (
  path: string,
  query?: Readonly<Record<string, QueryValue>>,
) => {
  const url = new URL(path, "http://api.internal");

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;

      for (const item of Array.isArray(value) ? value : [value]) {
        url.searchParams.append(key, String(item));
      }
    }
  }

  return url.toString();
};

const mapHttpStatusError = (status: number) => {
  if (status === 401) return new RpcUnauthorizedError();

  if (status === 403) return new RpcForbiddenError();

  if (status === 404) return new RpcNotFoundError();

  return new RpcUnavailableError({
    message: `Internal API returned ${status}`,
  });
};

export const makeApiRpcServer = <E, R>(routes: Layer.Layer<never, E, R>) =>
  Layer.unwrap(
    Effect.gen(function* () {
      const config = yield* ApiRuntimeConfig;
      const internalGuilds = yield* InternalGuildsData;

      const context =
        yield* Effect.context<
          Exclude<
            R,
            | HttpRouter.HttpRouter
            | HttpRouter.Provided
            | HttpRouter.Request<string, unknown>
            | Layer.Success<typeof HttpServer.layerServices>
          >
        >();

      const web = yield* Effect.acquireRelease(
        Effect.sync(() =>
          HttpRouter.toWebHandler(
            Layer.mergeAll(
              // SAFETY: ProcessHandlerInfrastructure services are provided via `context`, leaving only HttpRouter/HttpServer provided by `toWebHandler`.
              routes.pipe(
                Layer.provide(Layer.succeedContext(context)),
              ) as Layer.Layer<never, E, HttpRouter.HttpRouter>,
              HttpServer.layerServices,
            ),
            { disableLogger: true },
          ),
        ),
        (boundary) => Effect.promise(() => boundary.dispose()),
      );

      const memberGet = <A, I>(
        actor: { readonly userId: string; readonly discordId: string },
        path: string,
        schema: Schema.Codec<A, I>,
        query?: Readonly<Record<string, QueryValue>>,
      ) =>
        Effect.tryPromise({
          try: () =>
            web.handler(
              new Request(buildInternalUrl(path, query), {
                headers: {
                  [AUTH_USER_ID_HEADER]: actor.userId,
                  [AUTH_DISCORD_ID_HEADER]: actor.discordId,
                },
              }),
            ),
          catch: () =>
            new RpcUnavailableError({ message: "In-process API call failed" }),
        }).pipe(
          Effect.flatMap((response) => {
            if (response.status < 200 || response.status >= 300) {
              return Effect.fail(mapHttpStatusError(response.status));
            }

            return Effect.tryPromise({
              try: () => response.text(),
              catch: () =>
                new RpcUnavailableError({
                  message: "Failed to read in-process API response",
                }),
            }).pipe(
              Effect.flatMap((text) =>
                Schema.decodeEffect(Schema.fromJsonString(schema))(text).pipe(
                  Effect.mapError(
                    () =>
                      new RpcUnavailableError({
                        message: "Failed to decode in-process API response",
                      }),
                  ),
                ),
              ),
            );
          }),
        );

      const handlers = ApiRpcGroup.toLayer({
        getUserGuildPermissions: ({ discordId, userId, freshness }) => {
          if (discordId.length === 0 || userId.length === 0) {
            return Effect.succeed([]);
          }

          return internalGuilds
            .getUserPermissions(discordId, userId, freshness)
            .pipe(
              Effect.flatMap((value) =>
                Schema.decodeEffect(UserPermissionsList)(value),
              ),
              Effect.mapError(
                () =>
                  new RpcUnavailableError({
                    message: "Failed to load user guild permissions",
                  }),
              ),
            );
        },
        getGuildByIdOrVanityUrl: ({ idOrVanityUrl }) =>
          Effect.gen(function* () {
            const guild = yield* internalGuilds.getGuild(idOrVanityUrl).pipe(
              Effect.mapError(
                () =>
                  new RpcUnavailableError({
                    message: "Failed to look up guild",
                  }),
              ),
            );

            if (guild === null) {
              return yield* new RpcNotFoundError({
                message: "Guild not found",
              });
            }

            return yield* Schema.decodeUnknownEffect(RpcGuildLookup)(
              guild,
            ).pipe(
              Effect.mapError(
                () =>
                  new RpcUnavailableError({
                    message: "Invalid guild lookup payload",
                  }),
              ),
            );
          }),
        getMemberIdentity: ({ guildId, discordId }) =>
          Effect.gen(function* () {
            const identity = yield* internalGuilds
              .getMemberIdentity(guildId, discordId)
              .pipe(
                Effect.mapError(
                  () =>
                    new RpcUnavailableError({
                      message: "Failed to resolve member identity",
                    }),
                ),
              );

            if (identity === null) {
              return yield* new RpcNotFoundError({
                message: "Member not found",
              });
            }

            return yield* Schema.decodeEffect(InternalMemberIdentityResponse)(
              identity,
            ).pipe(
              Effect.mapError(
                () =>
                  new RpcUnavailableError({
                    message: "Invalid member identity payload",
                  }),
              ),
            );
          }),
        getUserAccessibleGuilds: ({ userId, discordId }) =>
          memberGet(
            { userId, discordId },
            "/users/@me/guilds",
            AccessibleGuildsList,
          ).pipe(
            Effect.catchTags({
              RpcForbiddenError: (error) =>
                Effect.fail(
                  new RpcUnavailableError({ message: error.message }),
                ),
              RpcNotFoundError: (error) =>
                Effect.fail(
                  new RpcUnavailableError({ message: error.message }),
                ),
            }),
          ),
        listGuildEvents: ({ userId, discordId, guildId }) =>
          memberGet(
            { userId, discordId },
            `/guilds/${encodeURIComponent(guildId)}/events`,
            EventsList,
          ),
        getEventRanking: ({ userId, discordId, guildId, eventId }) =>
          memberGet(
            { userId, discordId },
            `/guilds/${encodeURIComponent(guildId)}/events/${encodeURIComponent(eventId)}/ranking`,
            EventRankingList,
          ),
        getEventTimers: ({ userId, discordId, guildId, eventId, world }) =>
          memberGet(
            { userId, discordId },
            `/guilds/${encodeURIComponent(guildId)}/events/${encodeURIComponent(eventId)}/timers`,
            EventTimersList,
            { world },
          ),
        getEventWrapped: ({ userId, discordId, guildId, eventId }) =>
          memberGet(
            { userId, discordId },
            `/guilds/${encodeURIComponent(guildId)}/events/${encodeURIComponent(eventId)}/wrapped`,
            RpcEventWrapped,
          ),
        listGuildTimers: ({ userId, discordId, guildId, world }) =>
          memberGet(
            { userId, discordId },
            `/guilds/${encodeURIComponent(guildId)}/timers`,
            GuildTimersList,
            { world },
          ),
        getGuildKillStats: ({ userId, discordId, guildId, period, npcTypes }) =>
          memberGet(
            { userId, discordId },
            `/guilds/${encodeURIComponent(guildId)}/stats/kills`,
            RpcGuildKillStats,
            { period, npcTypes },
          ),
        getGuildTopKilledNpcs: ({
          userId,
          discordId,
          guildId,
          limit,
          search,
          period,
        }) =>
          memberGet(
            { userId, discordId },
            `/guilds/${encodeURIComponent(guildId)}/stats/kills/top-npcs`,
            RpcTopKilledNpcs,
            { limit, search, period },
          ),
        getNpcKillers: ({ userId, discordId, guildId, npcId, limit, period }) =>
          memberGet(
            { userId, discordId },
            `/guilds/${encodeURIComponent(guildId)}/stats/kills/npcs/${npcId}/killers`,
            RpcNpcKillers,
            { limit, period },
          ),
        listGuildLoots: ({
          userId,
          discordId,
          guildId,
          limit,
          players,
          npcs,
          rarities,
          itemNames,
        }) =>
          memberGet(
            { userId, discordId },
            `/guilds/${encodeURIComponent(guildId)}/loots`,
            RpcGuildLootPage,
            { limit, players, npcs, rarities, itemNames },
          ),
        listUserReservations: ({ userId, discordId, status }) =>
          memberGet(
            { userId, discordId },
            "/users/@me/reservations",
            RpcReservationPage,
            { status },
          ),
        listGuildReservationSpots: ({ userId, discordId, guildId }) =>
          memberGet(
            { userId, discordId },
            `/guilds/${encodeURIComponent(guildId)}/reservation-spots`,
            ReservationSpotsList,
          ),
      });

      return serviceRpcServer({
        group: ApiRpcGroup,
        handlers,
        port: config.rpcPort,
        spanPrefix: "api.rpc",
      });
    }),
  );
