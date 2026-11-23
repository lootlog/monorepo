import { boundedHttpGet } from "@lootlog/instrumentation/bounded-http-get";
import {
  ApiRpcGroup,
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
import { makeRpcClient } from "@lootlog/rpc/client";
import {
  RpcBadRequestError,
  RpcForbiddenError,
  RpcNotFoundError,
  RpcUnauthorizedError,
  RpcUnavailableError,
} from "@lootlog/rpc/errors";
import type { RpcClientError } from "effect/rpc";
import {
  GatewayRpcGroup,
  type GatewayPresenceSnapshot,
} from "@lootlog/rpc/gateway";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { type Cause, Context, Effect, Layer, Schema } from "effect";
import { HttpClient } from "effect/http";
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

type RpcCallError =
  | RpcUnauthorizedError
  | RpcForbiddenError
  | RpcNotFoundError
  | RpcUnavailableError
  | RpcBadRequestError
  | RpcClientError.RpcClientError
  | Cause.TimeoutError;

const mapRpcFailure = (error: RpcCallError): CommandFailure => {
  if (Schema.is(RpcUnauthorizedError)(error)) {
    return new CommandFailure({ reason: "reauthenticate" });
  }

  if (Schema.is(RpcForbiddenError)(error)) {
    return new CommandFailure({ reason: "forbidden" });
  }

  if (Schema.is(RpcNotFoundError)(error)) {
    return new CommandFailure({ reason: "not-found" });
  }

  return new CommandFailure({ reason: "unavailable" });
};

const runRpc = <A, E extends RpcCallError>(
  effect: Effect.Effect<A, E>,
): Effect.Effect<A, CommandFailure> =>
  effect.pipe(
    Effect.timeout("2500 millis"),
    Effect.mapError((error) => mapRpcFailure(error)),
  );

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
  readonly getGuildKillStats: (params: {
    readonly period?: string;
    readonly npcTypes?: ReadonlyArray<string>;
  }) => Effect.Effect<typeof RpcGuildKillStats.Type, CommandFailure>;
  readonly getGuildTopKilledNpcs: (params: {
    readonly limit: number;
    readonly search?: string;
    readonly period?: string;
  }) => Effect.Effect<typeof RpcTopKilledNpcs.Type, CommandFailure>;
  readonly getNpcKillers: (params: {
    readonly npcId: number;
    readonly limit: number;
    readonly period?: string;
  }) => Effect.Effect<typeof RpcNpcKillers.Type, CommandFailure>;
  readonly listGuildLoots: (params: {
    readonly limit: number;
    readonly players?: ReadonlyArray<string>;
    readonly npcs?: ReadonlyArray<string>;
    readonly rarities?: ReadonlyArray<string>;
    readonly itemNames?: ReadonlyArray<string>;
  }) => Effect.Effect<typeof RpcGuildLootPage.Type, CommandFailure>;
  readonly listUserReservations: (
    status?: string,
  ) => Effect.Effect<typeof RpcReservationPage.Type, CommandFailure>;
  readonly listGuildReservationSpots: Effect.Effect<
    ReadonlyArray<typeof RpcReservationSpot.Type>,
    CommandFailure
  >;
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
  readonly publicFile: (
    path: string,
  ) => Effect.Effect<Uint8Array, CommandFailure>;
}

const failureForStatus = (status: number): CommandFailure | undefined => {
  if (status >= 200 && status < 300) return undefined;

  if (status === 401) return new CommandFailure({ reason: "reauthenticate" });

  if (status === 403) return new CommandFailure({ reason: "forbidden" });

  if (status === 404) return new CommandFailure({ reason: "not-found" });

  return new CommandFailure({ reason: "unavailable" });
};

export class LootlogClient extends Context.Service<
  LootlogClient,
  LootlogClientValue
>()("@lootlog/discord-bot/LootlogClient") {
  static readonly layer = Layer.effect(
    LootlogClient,
    Effect.gen(function* () {
      const config = yield* BotConfig;
      const httpClient = yield* HttpClient.HttpClient;

      const apiRpc = yield* makeRpcClient(ApiRpcGroup, {
        url: config.apiRpcUrl,
        spanPrefix: "discord-bot.api-rpc",
      });

      const gatewayRpc = yield* makeRpcClient(GatewayRpcGroup, {
        url: config.gatewayRpcUrl,
        spanPrefix: "discord-bot.gateway-rpc",
      });

      const catalogRpc = yield* makeRpcClient(CatalogRpcGroup, {
        url: config.catalogRpcUrl,
        spanPrefix: "discord-bot.catalog-rpc",
      });

      const member = Effect.fn("LootlogClient.member")(function* (
        guildId: string,
        discordId: string,
      ) {
        const { userId, memberId } = yield* runRpc(
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
            listGuildEvents: runRpc(apiRpc.listGuildEvents(guildActor)),
            getEventRanking: (eventId) =>
              runRpc(apiRpc.getEventRanking({ ...guildActor, eventId })),
            getEventTimers: (eventId, world) =>
              runRpc(apiRpc.getEventTimers({ ...guildActor, eventId, world })),
            getEventWrapped: (eventId) =>
              runRpc(apiRpc.getEventWrapped({ ...guildActor, eventId })),
            listGuildTimers: (world) =>
              runRpc(
                apiRpc.listGuildTimers(
                  world !== undefined ? { ...guildActor, world } : guildActor,
                ),
              ),
            getGuildKillStats: (params) =>
              runRpc(apiRpc.getGuildKillStats({ ...guildActor, ...params })),
            getGuildTopKilledNpcs: (params) =>
              runRpc(
                apiRpc.getGuildTopKilledNpcs({ ...guildActor, ...params }),
              ),
            getNpcKillers: (params) =>
              runRpc(apiRpc.getNpcKillers({ ...guildActor, ...params })),
            listGuildLoots: (params) =>
              runRpc(apiRpc.listGuildLoots({ ...guildActor, ...params })),
            listUserReservations: (status) =>
              runRpc(
                apiRpc.listUserReservations(
                  status !== undefined ? { ...actor, status } : actor,
                ),
              ),
            listGuildReservationSpots: runRpc(
              apiRpc.listGuildReservationSpots(guildActor),
            ),
          },
          gateway: {
            getOrganizationPresence: runRpc(
              gatewayRpc.getOrganizationPresence({
                userId,
                discordId,
                organizationId: guildId,
              }),
            ),
          },
        } satisfies MemberSession;
      });

      const publicFile = (path: string) =>
        boundedHttpGet({
          client: httpClient,
          url: new URL(path, config.apiServiceUrl),
          timeoutMilliseconds: 2500,
          retries: 1,
          operationId: path,
          adapter: "discord-command",
          response: "raw",
          failure: (_reason, retryable) => ({ retryable }),
          decode: (body, status) => ({ status, body: new Uint8Array(body) }),
        }).pipe(
          Effect.mapError(() => new CommandFailure({ reason: "unavailable" })),
          Effect.flatMap(({ status, body }) => {
            const failure = failureForStatus(status);

            return failure ? Effect.fail(failure) : Effect.succeed(body);
          }),
        );

      return LootlogClient.of({
        member,
        catalog: {
          searchItems: (params) => runRpc(catalogRpc.searchItems(params)),
        },
        publicFile,
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
