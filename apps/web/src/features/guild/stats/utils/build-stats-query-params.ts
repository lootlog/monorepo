import type { KilledNpcType } from "@/constants/npc";
import { omitBy } from "es-toolkit";
import type {
  KillsControllerGetGuildKillStatsParams,
  KillsControllerGetGuildTopNpcsParams,
  KillsControllerGetMemberKillsParams,
  KillsControllerGetNpcKillersParams,
  LootsControllerGetLootStatsParams,
  LootsControllerGetLootStatsPeriod,
} from "@lootlog/client/main";

import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";

export const DEFAULT_MEMBER_KILLS_LIMIT = 40;

const DEFAULT_NPC_KILLERS_LIMIT = 50;

const withDefinedEntries = <T extends Record<string, unknown>>(params: T) => {
  const definedParams = omitBy(params, (value) => value === undefined);

  if (Object.keys(definedParams).length === 0) {
    return undefined;
  }

  return definedParams;
};

export const buildGuildKillStatsParams = (filters: {
  npcTypes?: KilledNpcType[];
  minLvl?: number;
  maxLvl?: number;
  world?: string;
  period?: KillStatsPeriod;
}): KillsControllerGetGuildKillStatsParams | undefined =>
  withDefinedEntries({
    npcTypes: filters.npcTypes,
    npcLevelMin: filters.minLvl,
    npcLevelMax: filters.maxLvl,
    world: filters.world,
    period: filters.period ?? "all",
  });

export const buildGuildTopNpcsParams = (filters: {
  limit: number;
  npcType?: KilledNpcType;
  world?: string;
  search?: string;
  minLvl?: number;
  maxLvl?: number;
  period?: KillStatsPeriod;
}): KillsControllerGetGuildTopNpcsParams =>
  withDefinedEntries({
    limit: filters.limit,
    npcType: filters.npcType,
    world: filters.world || undefined,
    search: filters.search || undefined,
    npcLevelMin: filters.minLvl,
    npcLevelMax: filters.maxLvl,
    period: filters.period ?? "all",
  }) ?? {};

export const buildMemberKillsParams = (filters: {
  world?: string;
  npcTypes?: KilledNpcType[];
  search?: string;
  limit?: number;
  cursor?: string;
  minLvl?: number;
  maxLvl?: number;
  period?: KillStatsPeriod;
}): KillsControllerGetMemberKillsParams =>
  withDefinedEntries({
    world: filters.world,
    npcTypes: filters.npcTypes,
    search: filters.search,
    limit: filters.limit,
    cursor: filters.cursor,
    npcLevelMin: filters.minLvl,
    npcLevelMax: filters.maxLvl,
    period: filters.period ?? "all",
  }) ?? {};

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
    period: filters.period ?? "all",
  }) ?? {};

export const buildLootStatsParams = (filters: {
  period: LootsControllerGetLootStatsPeriod;
  world?: string;
  npcTypes?: KilledNpcType[];
  excludeColossus?: boolean;
}): LootsControllerGetLootStatsParams | undefined =>
  withDefinedEntries({
    period: filters.period,
    world: filters.world,
    npcTypes: filters.npcTypes?.length ? filters.npcTypes : undefined,
    excludeColossus: filters.excludeColossus || undefined,
  });
