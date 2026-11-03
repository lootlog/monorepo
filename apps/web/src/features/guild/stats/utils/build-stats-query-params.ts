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
import { parseKillStatsLevel } from "@/features/kills/parse-kill-stats-level";
import type { StatsSettings } from "../hooks/use-stats-settings";

export const DEFAULT_MEMBER_KILLS_LIMIT = 40;

/**
 * The monster ranking and an NPC's killers are top-N lists: the API returns
 * neither a total nor a cursor, so a full list means "at least this many".
 */
export const GUILD_TOP_NPCS_LIST_LIMIT = 100;

export const NPC_KILLERS_LIMIT = 50;

const withDefinedEntries = <T extends Record<string, unknown>>(params: T) => {
  const definedParams = omitBy(params, (value) => value === undefined);

  if (Object.keys(definedParams).length === 0) {
    return undefined;
  }

  return definedParams;
};

export const buildGuildKillStatsParams = (
  settings: StatsSettings,
): KillsControllerGetGuildKillStatsParams | undefined =>
  withDefinedEntries({
    npcLevelMin: parseKillStatsLevel(settings.minLvl),
    npcLevelMax: parseKillStatsLevel(settings.maxLvl),
    world: settings.world ?? undefined,
    period: settings.period,
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

/** The member page's kills request, for its loader and its hook alike. */
export const buildMemberKillsParams = (
  settings: StatsSettings,
  cursor?: string,
): KillsControllerGetMemberKillsParams =>
  withDefinedEntries({
    world: settings.world ?? undefined,
    npcTypes: settings.npcType === "ALL" ? undefined : [settings.npcType],
    search: settings.search || undefined,
    limit: DEFAULT_MEMBER_KILLS_LIMIT,
    cursor,
    npcLevelMin: parseKillStatsLevel(settings.minLvl),
    npcLevelMax: parseKillStatsLevel(settings.maxLvl),
    period: settings.period,
  }) ?? {};

/** The NPC page's killers request, for its loader and its hook alike. */
export const buildNpcKillersParams = (
  settings: StatsSettings,
): KillsControllerGetNpcKillersParams =>
  withDefinedEntries({
    limit: NPC_KILLERS_LIMIT,
    world: settings.world ?? undefined,
    period: settings.period,
  }) ?? {};

export const buildLootStatsParams = (filters: {
  period: LootsControllerGetLootStatsPeriod;
  world: string | null;
  excludeColossus: boolean;
}): LootsControllerGetLootStatsParams | undefined =>
  withDefinedEntries({
    period: filters.period,
    world: filters.world ?? undefined,
    excludeColossus: filters.excludeColossus || undefined,
  });
