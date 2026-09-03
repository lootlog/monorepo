import { Effect, Schema } from "effect";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import type { UserKillQueries } from "#src/kills/user-kill-queries";
import type { MemberKillQuery } from "#src/kills/member-kill-query";
import type { GuildKillQueries } from "#src/kills/guild-kill-queries";
import type { LootAllocationOperations } from "#src/loots/allocation/loot-allocation.operations";
import type { LootSubmissionAcceptance } from "#src/loots/submission/loot-submission-acceptance.service";
import type { LootStatsService } from "#src/loots/query/loot-stats.service";
import type { LootsOperations } from "#src/loots/loots.operations";
import {
  LootResponse,
  NullableLootResponse,
} from "#src/loots/loot-response.schema";
import { LootCommentResponse } from "#src/shared/schema/loot-comment";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { normalizeKillStatsPeriod } from "#src/kills/kill-stats-period";
import type { KillsControllerCreateKill201 } from "../../contracts/kills/schemas.js";
import {
  LootsControllerCreateComment201,
  LootsControllerFetchLootById200,
  LootsControllerFetchLootsByGuildId200,
  LootsControllerGetComments200,
} from "../../contracts/loots/schemas.js";
import { RecordsData, RecordsDataError } from "./records.operations.js";

export interface RecordsServices {
  readonly createKill: (
    discordId: string,
    payload: Parameters<RecordsData["Service"]["createKill"]>[1],
  ) => Effect.Effect<KillsControllerCreateKill201, unknown>;
  readonly userKillQueries: UserKillQueries;
  readonly memberKillQuery: MemberKillQuery;
  readonly guildKillQueries: GuildKillQueries;
  readonly loots: LootsOperations;
  readonly lootStats: LootStatsService;
  readonly lootSubmissionAcceptance: LootSubmissionAcceptance;
  readonly lootAllocation: LootAllocationOperations;
}

const decode = <A>(decoder: (value: unknown) => A, value: unknown) =>
  Effect.try({
    try: () => decoder(value),
    catch: (cause) => new RecordsDataError({ cause }),
  });

const lootOperation = <A>(
  operationId: string,
  effect: Effect.Effect<A, unknown>,
) =>
  effect.pipe(
    Effect.mapError((cause) => new RecordsDataError({ cause })),
    Effect.withSpan(operationId, {
      attributes: { adapter: "loots", retryCount: 0 },
    }),
  );

const mutableNpcTypes = <
  T extends { readonly npcTypes?: ReadonlyArray<unknown> },
>(
  query: T,
) =>
  ({
    ...query,
    npcTypes: query.npcTypes ? [...query.npcTypes] : undefined,
  }) as unknown as Omit<T, "npcTypes"> & {
    npcTypes:
      | (T["npcTypes"] extends ReadonlyArray<infer Item> ? Item[] : never)
      | undefined;
  };

const mutableLootQuery = <
  T extends {
    readonly npcs?: ReadonlyArray<string>;
    readonly players?: ReadonlyArray<string>;
    readonly rarities?: ReadonlyArray<string>;
    readonly professions?: ReadonlyArray<string>;
    readonly npcTypes?: ReadonlyArray<string>;
    readonly itemNames?: ReadonlyArray<string>;
  },
>(
  query: T,
) => ({
  ...query,
  npcs: query.npcs ? [...query.npcs] : undefined,
  players: query.players ? [...query.players] : undefined,
  rarities: query.rarities ? [...query.rarities] : undefined,
  professions: query.professions ? [...query.professions] : undefined,
  npcTypes: query.npcTypes ? [...query.npcTypes] : undefined,
  itemNames: query.itemNames ? [...query.itemNames] : undefined,
});

export const recordsDataLayer = (services: RecordsServices) =>
  RecordsData.layer({
    createKill: (caller, payload) =>
      lootOperation(
        "KillsController_createKill",
        services.createKill(caller.discordId, payload),
      ),
    getGuildKillStats: (caller, query) =>
      lootOperation(
        "KillsController_getGuildKillStats",
        services.guildKillQueries.getGuildKillStats(
          caller.guild.id,
          caller.accessPolicy,
          [...caller.roles],
          mutableNpcTypes(query),
        ),
      ),
    getUserKillStats: (caller, query) =>
      lootOperation(
        "KillsController_getUserKillStats",
        services.userKillQueries.getUserKillStats(
          caller.discordId,
          mutableNpcTypes(query),
        ),
      ),
    getUserNpcKills: (caller, query) =>
      lootOperation(
        "KillsController_getUserNpcKills",
        services.userKillQueries.getUserNpcKills(
          caller.discordId,
          mutableNpcTypes(query),
        ),
      ),
    getGuildTopNpcs: (caller, query) =>
      lootOperation(
        "KillsController_getGuildTopNpcs",
        services.guildKillQueries.getGuildTopNpcs(
          caller.guild.id,
          caller.accessPolicy,
          [...caller.roles],
          query.limit ?? 10,
          query.npcType,
          query.world,
          query.search,
          query.minLvl ? Number.parseInt(query.minLvl, 10) : undefined,
          query.maxLvl ? Number.parseInt(query.maxLvl, 10) : undefined,
          normalizeKillStatsPeriod(query.period),
        ),
      ),
    getGuildTopKillersByType: (caller, query) =>
      lootOperation(
        "KillsController_getGuildTopKillersByType",
        services.guildKillQueries.getGuildTopKillersByType(
          caller.guild.id,
          caller.accessPolicy,
          [...caller.roles],
          [NpcType.TITAN, NpcType.HERO, NpcType.EVENT_HERO],
          query.limit ?? 5,
          normalizeKillStatsPeriod(query.period),
        ),
      ),
    getNpcKillers: (caller, npcId, query) =>
      lootOperation(
        "KillsController_getNpcKillers",
        services.guildKillQueries.getNpcKillers(
          caller.guild.id,
          caller.accessPolicy,
          [...caller.roles],
          npcId,
          query.limit ?? 50,
          query.world,
          query.period,
        ),
      ),
    getMemberKills: (caller, memberId, query) =>
      lootOperation(
        "KillsController_getMemberKills",
        services.memberKillQuery(
          caller.guild.id,
          memberId,
          caller.accessPolicy,
          [...caller.roles],
          mutableNpcTypes(query),
        ),
      ),
    fetchLoots: (caller, query) =>
      lootOperation(
        "LootsController_fetchLootsByGuildId",
        services.loots.fetchLootsByGuildId(
          caller.guild,
          caller.accessPolicy,
          [...caller.roles],
          mutableLootQuery(query),
        ),
      ).pipe(
        Effect.map((result) =>
          result.map((loot) => encodeUnknownResponse(LootResponse, loot)),
        ),
        Effect.flatMap((result) =>
          decode(
            Schema.decodeUnknownSync(LootsControllerFetchLootsByGuildId200),
            result,
          ),
        ),
      ),
    getLootStats: (caller, query) =>
      lootOperation(
        "LootsController_getLootStats",
        services.lootStats.getLootStatsEffect(
          caller.guild.id,
          caller.accessPolicy,
          [...caller.roles],
          query.period ?? "7d",
          query.world,
          query.npcTypes ? query.npcTypes.split(",") : undefined,
          query.excludeColossus ?? false,
        ),
      ),
    countLoots: (caller, query) =>
      lootOperation(
        "LootsController_countLootsByGuildId",
        services.loots.countLootsByGuildId(
          caller.guild,
          caller.accessPolicy,
          [...caller.roles],
          { ...mutableLootQuery(query), limit: 0, cursor: 0 },
        ),
      ),
    resolveLootItem: (caller, query) =>
      lootOperation(
        "LootsController_resolveLootItemByHid",
        services.loots.resolveLootItemByHid(
          caller.guild,
          caller.accessPolicy,
          [...caller.roles],
          query,
        ),
      ),
    fetchLoot: (caller, lootId) =>
      lootOperation(
        "LootsController_fetchLootById",
        services.loots.fetchLootById(
          caller.guild,
          caller.accessPolicy,
          [...caller.roles],
          lootId,
        ),
      ).pipe(
        Effect.map((result) =>
          encodeUnknownResponse(NullableLootResponse, result),
        ),
        Effect.flatMap((result) =>
          decode(
            Schema.decodeUnknownSync(LootsControllerFetchLootById200),
            result,
          ),
        ),
      ),
    archiveLoot: (caller, lootId) =>
      lootOperation(
        "LootsController_deleteLoot",
        services.loots
          .archiveLoot({
            discordId: caller.discordId,
            guild: caller.guild,
            lootId,
            accessPolicy: caller.accessPolicy,
            roles: [...caller.roles],
          })
          .pipe(Effect.as(true)),
      ),
    createLoot: (caller, payload) =>
      lootOperation(
        "LootsController_createLoot",
        services.lootSubmissionAcceptance.accept({
          discordId: caller.discordId,
          submission: {
            ...payload,
            loots: payload.loots.map((loot) => ({ ...loot })),
            npcs: payload.npcs.map((npc) => ({ ...npc })),
            players: payload.players.map((player) => ({ ...player })),
          },
        }),
      ),
    getComments: (caller, lootId) =>
      lootOperation(
        "LootsController_getComments",
        services.loots.getComments({
          lootId,
          guild: caller.guild,
          accessPolicy: caller.accessPolicy,
          roles: [...caller.roles],
        }),
      ).pipe(
        Effect.map((result) =>
          result.map((comment) =>
            encodeUnknownResponse(LootCommentResponse, comment),
          ),
        ),
        Effect.flatMap((result) =>
          decode(
            Schema.decodeUnknownSync(LootsControllerGetComments200),
            result,
          ),
        ),
      ),
    createComment: (caller, lootId, payload) =>
      lootOperation(
        "LootsController_createComment",
        services.loots.createComment({
          discordId: caller.discordId,
          lootId,
          body: payload,
          guild: caller.guild,
          accessPolicy: caller.accessPolicy,
          roles: [...caller.roles],
        }),
      ).pipe(
        Effect.map((result) =>
          encodeUnknownResponse(LootCommentResponse, result),
        ),
        Effect.flatMap((result) =>
          decode(
            Schema.decodeUnknownSync(LootsControllerCreateComment201),
            result,
          ),
        ),
      ),
    updateLoot: (caller, lootId, payload) =>
      lootOperation(
        "LootsController_updateLoot",
        services.lootAllocation.confirmFromChat({
          actorUserId: caller.userId,
          lootId,
          message: payload.msg,
        }),
      ),
  });
