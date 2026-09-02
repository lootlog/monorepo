import { Effect, Schema } from "effect";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import type { KillsService } from "#src/kills/kills.service";
import type { LootAllocationService } from "#src/loots/loot-allocation.service";
import type { LootSubmissionAcceptanceService } from "#src/loots/loot-submission-acceptance.service";
import type { LootStatsService } from "#src/loots/services/loot-stats.service";
import type { LootsService } from "#src/loots/loots.service";
import { normalizeKillStatsPeriod } from "#src/kills/utils/kill-stats-period";
import {
  LootsControllerCreateComment201,
  LootsControllerFetchLootById200,
  LootsControllerFetchLootsByGuildId200,
  LootsControllerGetComments200,
} from "../../lootlog-api.generated.js";
import { KillsLootsData, KillsLootsDataError } from "./kills-loots.handlers.js";

export interface LegacyKillsLootsServices {
  readonly kills: KillsService;
  readonly loots: LootsService;
  readonly lootStats: LootStatsService;
  readonly lootSubmissionAcceptance: LootSubmissionAcceptanceService;
  readonly lootAllocation: LootAllocationService;
}

const attempt = <A>(operation: () => PromiseLike<A> | A) =>
  Effect.tryPromise({
    try: () => Promise.resolve(operation()),
    catch: (cause) => new KillsLootsDataError({ cause }),
  });

const decode = <A>(decoder: (value: unknown) => A, value: unknown) =>
  Effect.try({
    try: () => decoder(value),
    catch: (cause) => new KillsLootsDataError({ cause }),
  });

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

/**
 * Transitional Layer over the existing Drizzle-backed application services.
 * The adapter deliberately delegates one-for-one so transaction, cache and
 * side-effect ordering remains owned by the established services.
 */
export const legacyKillsLootsDataLayer = (services: LegacyKillsLootsServices) =>
  KillsLootsData.layer({
    createKill: (caller, payload) =>
      attempt(() => services.kills.createKill(caller.discordId, payload)),
    getGuildKillStats: (caller, query) =>
      attempt(() =>
        services.kills.getGuildKillStats(
          caller.guild.id,
          caller.accessPolicy,
          [...caller.roles],
          mutableNpcTypes(query),
        ),
      ),
    getUserKillStats: (caller, query) =>
      attempt(() =>
        services.kills.getUserKillStats(
          caller.discordId,
          mutableNpcTypes(query),
        ),
      ),
    getUserNpcKills: (caller, query) =>
      attempt(() =>
        services.kills.getUserNpcKills(
          caller.discordId,
          mutableNpcTypes(query),
        ),
      ),
    getGuildTopNpcs: (caller, query) =>
      attempt(() =>
        services.kills.getGuildTopNpcs(
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
      attempt(() =>
        services.kills.getGuildTopKillersByType(
          caller.guild.id,
          caller.accessPolicy,
          [...caller.roles],
          [NpcType.TITAN, NpcType.HERO, NpcType.EVENT_HERO],
          query.limit ?? 5,
          normalizeKillStatsPeriod(query.period),
        ),
      ),
    getNpcKillers: (caller, npcId, query) =>
      attempt(() =>
        services.kills.getNpcKillers(
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
      attempt(() =>
        services.kills.getMemberKills(
          caller.guild.id,
          memberId,
          caller.accessPolicy,
          [...caller.roles],
          mutableNpcTypes(query),
        ),
      ),
    fetchLoots: (caller, query) =>
      attempt(() =>
        services.loots.fetchLootsByGuildId(
          caller.guild,
          caller.accessPolicy,
          [...caller.roles],
          mutableLootQuery(query),
        ),
      ).pipe(
        Effect.flatMap((result) =>
          decode(
            Schema.decodeUnknownSync(LootsControllerFetchLootsByGuildId200),
            result,
          ),
        ),
      ),
    getLootStats: (caller, query) =>
      attempt(() =>
        services.lootStats.getLootStats(
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
      attempt(() =>
        services.loots.countLootsByGuildId(
          caller.guild,
          caller.accessPolicy,
          [...caller.roles],
          { ...mutableLootQuery(query), limit: 0, cursor: 0 },
        ),
      ),
    resolveLootItem: (caller, query) =>
      attempt(() =>
        services.loots.resolveLootItemByHid(
          caller.guild,
          caller.accessPolicy,
          [...caller.roles],
          query,
        ),
      ),
    fetchLoot: (caller, lootId) =>
      attempt(() =>
        services.loots.fetchLootById(
          caller.guild,
          caller.accessPolicy,
          [...caller.roles],
          lootId,
        ),
      ).pipe(
        Effect.flatMap((result) =>
          decode(
            Schema.decodeUnknownSync(LootsControllerFetchLootById200),
            result,
          ),
        ),
      ),
    archiveLoot: (caller, lootId) =>
      attempt(async () => {
        await services.loots.archiveLoot({
          discordId: caller.discordId,
          guild: caller.guild,
          lootId,
          accessPolicy: caller.accessPolicy,
          roles: [...caller.roles],
        });
        return true;
      }),
    createLoot: (caller, payload) =>
      attempt(() =>
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
      attempt(() =>
        services.loots.getComments({
          lootId,
          guild: caller.guild,
          accessPolicy: caller.accessPolicy,
          roles: [...caller.roles],
        }),
      ).pipe(
        Effect.flatMap((result) =>
          decode(
            Schema.decodeUnknownSync(LootsControllerGetComments200),
            result,
          ),
        ),
      ),
    createComment: (caller, lootId, payload) =>
      attempt(() =>
        services.loots.createComment({
          discordId: caller.discordId,
          lootId,
          body: payload,
          guild: caller.guild,
          accessPolicy: caller.accessPolicy,
          roles: [...caller.roles],
        }),
      ).pipe(
        Effect.flatMap((result) =>
          decode(
            Schema.decodeUnknownSync(LootsControllerCreateComment201),
            result,
          ),
        ),
      ),
    updateLoot: (caller, lootId, payload) =>
      attempt(() =>
        services.lootAllocation.confirmFromChat({
          actorUserId: caller.userId,
          lootId,
          message: payload.msg,
        }),
      ),
  });
