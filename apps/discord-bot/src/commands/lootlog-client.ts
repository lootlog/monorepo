import {
  ApiRpcGroup,
  type RpcBingoBoardDetail,
  type RpcBingoBoardList,
  type RpcEventRankingEntry,
  type RpcEventSummary,
  type RpcEventTimer,
  type RpcEventWrapped,
  type RpcGuildKillStats,
  type RpcGuildLootPage,
  type RpcGuildTimer,
  type RpcNpcKillers,
  type RpcReservationPage,
  type RpcReservationSpot,
  type RpcTopKilledNpcs,
} from "@lootlog/rpc/api";
import {
  CatalogRpcGroup,
  type CatalogItemSearchResult,
} from "@lootlog/rpc/catalog";
import {
  boundedRpcCall,
  makeRpcClient,
  type ServiceRpcClient,
} from "@lootlog/rpc/client";
import {
  GatewayRpcGroup,
  type GatewayPresenceSnapshot,
} from "@lootlog/rpc/gateway";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Schema } from "effect";
import { BotConfig } from "#src/config/bot-config";

export class CommandFailure extends TaggedErrorClass<
  CommandFailure,
  { readonly brand: unique symbol }
>()("CommandFailure", {
  reason: Schema.Literals([
    "not-linked",
    "reauthenticate",
    "forbidden",
    "not-found",
    "unavailable",
  ]),
}) {}

const FAILURE_REASON_BY_RPC_ERROR = new Map<string, CommandFailure["reason"]>([
  ["RpcUnauthorizedError", "reauthenticate"],
  ["RpcForbiddenError", "forbidden"],
  ["RpcNotFoundError", "not-found"],
]);

const boundedCall = boundedRpcCall({ timeout: "2500 millis", retries: 1 });

const runRpc = <A, E extends { readonly _tag: string }>(
  call: () => Effect.Effect<A, E>,
): Effect.Effect<A, CommandFailure> =>
  boundedCall(call).pipe(
    Effect.mapError(
      (error) =>
        new CommandFailure({
          reason: FAILURE_REASON_BY_RPC_ERROR.get(error._tag) ?? "unavailable",
        }),
    ),
  );

type ApiClient = ServiceRpcClient<typeof ApiRpcGroup>;

type ApiPayload<Name extends keyof ApiClient> = Parameters<ApiClient[Name]>[0];

interface MemberApiClient {
  readonly listGuildEvents: Effect.Effect<
    ReadonlyArray<typeof RpcEventSummary.Type>,
    CommandFailure
  >;
  readonly getEventRanking: (
    eventId: string,
  ) => Effect.Effect<
    ReadonlyArray<typeof RpcEventRankingEntry.Type>,
    CommandFailure
  >;
  readonly getEventTimers: (
    eventId: string,
    world: string,
  ) => Effect.Effect<ReadonlyArray<typeof RpcEventTimer.Type>, CommandFailure>;
  readonly getEventWrapped: (
    eventId: string,
  ) => Effect.Effect<typeof RpcEventWrapped.Type, CommandFailure>;
  readonly listGuildTimers: (
    world?: string,
  ) => Effect.Effect<ReadonlyArray<typeof RpcGuildTimer.Type>, CommandFailure>;
  readonly getGuildKillStats: (
    params: Pick<ApiPayload<"getGuildKillStats">, "period" | "npcTypes">,
  ) => Effect.Effect<typeof RpcGuildKillStats.Type, CommandFailure>;
  readonly getGuildTopKilledNpcs: (
    params: Pick<
      ApiPayload<"getGuildTopKilledNpcs">,
      "limit" | "search" | "period"
    >,
  ) => Effect.Effect<typeof RpcTopKilledNpcs.Type, CommandFailure>;
  readonly getNpcKillers: (
    params: Pick<ApiPayload<"getNpcKillers">, "npcId" | "limit" | "period">,
  ) => Effect.Effect<typeof RpcNpcKillers.Type, CommandFailure>;
  readonly listGuildLoots: (
    params: Pick<
      ApiPayload<"listGuildLoots">,
      "limit" | "players" | "npcs" | "rarities" | "itemNames"
    >,
  ) => Effect.Effect<typeof RpcGuildLootPage.Type, CommandFailure>;
  readonly listUserReservations: (
    status?: ApiPayload<"listUserReservations">["status"],
  ) => Effect.Effect<typeof RpcReservationPage.Type, CommandFailure>;
  readonly listGuildReservationSpots: Effect.Effect<
    ReadonlyArray<typeof RpcReservationSpot.Type>,
    CommandFailure
  >;
  readonly listGuildBingoBoards: Effect.Effect<
    typeof RpcBingoBoardList.Type,
    CommandFailure
  >;
  readonly getGuildBingoBoard: (
    boardId: string,
  ) => Effect.Effect<typeof RpcBingoBoardDetail.Type, CommandFailure>;
}

interface MemberGatewayClient {
  readonly getOrganizationPresence: Effect.Effect<
    GatewayPresenceSnapshot,
    CommandFailure
  >;
}

export interface MemberSession {
  readonly guildId: string;
  readonly memberId: number;
  readonly api: MemberApiClient;
  readonly gateway: MemberGatewayClient;
}

export interface LootlogClientValue {
  readonly member: (
    guildId: string,
    discordId: string,
  ) => Effect.Effect<MemberSession, CommandFailure>;
  readonly catalog: {
    readonly searchItems: (params: {
      readonly search: string;
      readonly limit: number;
    }) => Effect.Effect<CatalogItemSearchResult, CommandFailure>;
  };
  readonly getGuildStatsCard: (
    guildId: string,
  ) => Effect.Effect<Uint8Array, CommandFailure>;
}

export class LootlogClient extends Context.Service<
  LootlogClient,
  LootlogClientValue
>()("@lootlog/discord-bot/LootlogClient") {
  static readonly layer = Layer.effect(
    LootlogClient,
    Effect.gen(function* () {
      const config = yield* BotConfig;

      const apiRpc = yield* makeRpcClient(ApiRpcGroup, {
        ...config.rpc.api,
        spanPrefix: "discord-bot.api-rpc",
      });

      const gatewayRpc = yield* makeRpcClient(GatewayRpcGroup, {
        ...config.rpc.gateway,
        spanPrefix: "discord-bot.gateway-rpc",
      });

      const catalogRpc = yield* makeRpcClient(CatalogRpcGroup, {
        ...config.rpc.catalog,
        spanPrefix: "discord-bot.catalog-rpc",
      });

      const member = Effect.fn("LootlogClient.member")(function* (
        guildId: string,
        discordId: string,
      ) {
        const { userId, memberId } = yield* runRpc(() =>
          apiRpc.getMemberIdentity({ guildId, discordId }),
        ).pipe(
          Effect.catchIf(
            (failure) => failure.reason === "not-found",
            () => Effect.fail(new CommandFailure({ reason: "not-linked" })),
          ),
        );

        const actor = { userId, discordId };
        const guildActor = { userId, discordId, guildId };

        return {
          guildId,
          memberId,
          api: {
            listGuildEvents: runRpc(() => apiRpc.listGuildEvents(guildActor)),
            getEventRanking: (eventId) =>
              runRpc(() => apiRpc.getEventRanking({ ...guildActor, eventId })),
            getEventTimers: (eventId, world) =>
              runRpc(() =>
                apiRpc.getEventTimers({ ...guildActor, eventId, world }),
              ),
            getEventWrapped: (eventId) =>
              runRpc(() => apiRpc.getEventWrapped({ ...guildActor, eventId })),
            listGuildTimers: (world) =>
              runRpc(() =>
                apiRpc.listGuildTimers(
                  world !== undefined ? { ...guildActor, world } : guildActor,
                ),
              ),
            getGuildKillStats: (params) =>
              runRpc(() =>
                apiRpc.getGuildKillStats({ ...guildActor, ...params }),
              ),
            getGuildTopKilledNpcs: (params) =>
              runRpc(() =>
                apiRpc.getGuildTopKilledNpcs({ ...guildActor, ...params }),
              ),
            getNpcKillers: (params) =>
              runRpc(() => apiRpc.getNpcKillers({ ...guildActor, ...params })),
            listGuildLoots: (params) =>
              runRpc(() => apiRpc.listGuildLoots({ ...guildActor, ...params })),
            listUserReservations: (status) =>
              runRpc(() =>
                apiRpc.listUserReservations(
                  status !== undefined ? { ...actor, status } : actor,
                ),
              ),
            listGuildReservationSpots: runRpc(() =>
              apiRpc.listGuildReservationSpots(guildActor),
            ),
            listGuildBingoBoards: runRpc(() =>
              apiRpc.listGuildBingoBoards(guildActor),
            ),
            getGuildBingoBoard: (boardId) =>
              runRpc(() =>
                apiRpc.getGuildBingoBoard({ ...guildActor, boardId }),
              ),
          },
          gateway: {
            getOrganizationPresence: runRpc(() =>
              gatewayRpc.getOrganizationPresence({
                userId,
                discordId,
                organizationId: guildId,
              }),
            ),
          },
        } satisfies MemberSession;
      });

      return LootlogClient.of({
        member,
        catalog: {
          searchItems: (params) => runRpc(() => catalogRpc.searchItems(params)),
        },
        getGuildStatsCard: (guildId) =>
          runRpc(() => apiRpc.getGuildStatsCard({ guildId })),
      });
    }),
  );
}

export const memberSession = (invocation: {
  readonly guildId: string;
  readonly discordId: string;
}) =>
  Effect.flatMap(LootlogClient, (client) =>
    client.member(invocation.guildId, invocation.discordId),
  );
