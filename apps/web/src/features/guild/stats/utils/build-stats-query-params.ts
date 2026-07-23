import type { KillsControllerGetGuildKillStatsParams } from "@lootlog/api-client/models/main/kills-controller-get-guild-kill-stats-params";
import type { KillsControllerGetGuildTopNpcsParams } from "@lootlog/api-client/models/main/kills-controller-get-guild-top-npcs-params";
import type { KillsControllerGetMemberKillsParams } from "@lootlog/api-client/models/main/kills-controller-get-member-kills-params";
import type { KillsControllerGetNpcKillersParams } from "@lootlog/api-client/models/main/kills-controller-get-npc-killers-params";
import type { LootsControllerGetLootStatsParams } from "@lootlog/api-client/models/main/loots-controller-get-loot-stats-params";
import type { LootsControllerGetLootStatsPeriod } from "@lootlog/api-client/models/main/loots-controller-get-loot-stats-period";
import type { NpcType } from "@lootlog/api-client/models/main/npc-type";
import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";

export const DEFAULT_MEMBER_KILLS_LIMIT = 40;
const DEFAULT_NPC_KILLERS_LIMIT = 50;

const withDefinedEntries = <T extends Record<string, unknown>>(params: T) => {
  const definedEntries = Object.entries(params).filter(
    ([, value]) => value !== undefined,
  );

  if (definedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(definedEntries);
};

export const buildGuildKillStatsParams = (filters: {
  npcTypes?: NpcType[];
  minLvl?: number;
  maxLvl?: number;
  world?: string;
  period?: KillStatsPeriod;
}): KillsControllerGetGuildKillStatsParams | undefined =>
  withDefinedEntries({
    npcTypes: filters.npcTypes,
    minLvl: filters.minLvl,
    maxLvl: filters.maxLvl,
    world: filters.world,
    period: filters.period === "all" ? undefined : filters.period,
  });

export const buildGuildTopNpcsParams = (filters: {
  limit: number;
  npcType?: NpcType;
  world?: string;
  search?: string;
  minLvl?: number;
  maxLvl?: number;
  period?: KillStatsPeriod;
}): KillsControllerGetGuildTopNpcsParams => ({
  limit: filters.limit,
  npcType: filters.npcType,
  world: filters.world ?? "",
  search: filters.search ?? "",
  minLvl: filters.minLvl === undefined ? "" : String(filters.minLvl),
  maxLvl: filters.maxLvl === undefined ? "" : String(filters.maxLvl),
  period: filters.period ?? "all",
});

export const buildMemberKillsParams = (filters: {
  world?: string;
  npcTypes?: NpcType[];
  search?: string;
  limit?: number;
  cursor?: number;
  minLvl?: number;
  maxLvl?: number;
  period?: KillStatsPeriod;
}): KillsControllerGetMemberKillsParams => ({
  world: filters.world,
  npcTypes: filters.npcTypes,
  search: filters.search,
  limit: filters.limit,
  cursor: filters.cursor ?? 0,
  minLvl: filters.minLvl ?? 0,
  maxLvl: filters.maxLvl ?? 0,
  period: filters.period === "all" ? undefined : filters.period,
});

export const buildNpcKillersParams = (
  filters: {
    limit?: number;
    world?: string;
    period?: KillStatsPeriod;
  } = {},
): KillsControllerGetNpcKillersParams =>
  withDefinedEntries({
    limit: filters.limit ?? DEFAULT_NPC_KILLERS_LIMIT,
    world: filters.world,
    period: filters.period === "all" ? undefined : filters.period,
  }) ?? {};

export const buildLootStatsParams = (filters: {
  period: LootsControllerGetLootStatsPeriod;
  world?: string;
  npcTypes?: NpcType[];
  excludeColossus?: boolean;
}): LootsControllerGetLootStatsParams | undefined =>
  withDefinedEntries({
    period: filters.period,
    world: filters.world,
    npcTypes: filters.npcTypes?.join(","),
    excludeColossus: filters.excludeColossus || undefined,
  });
