import type { KillsControllerGetGuildKillStatsParams } from "@/lib/api/generated/main/model/kills-controller-get-guild-kill-stats-params";
import type { KillsControllerGetGuildKillStatsNpcTypesItem } from "@/lib/api/generated/main/model/kills-controller-get-guild-kill-stats-npc-types-item";
import type { KillsControllerGetGuildTopNpcsParams } from "@/lib/api/generated/main/model/kills-controller-get-guild-top-npcs-params";
import type { KillsControllerGetMemberKillsParams } from "@/lib/api/generated/main/model/kills-controller-get-member-kills-params";
import type { KillsControllerGetMemberKillsNpcTypesItem } from "@/lib/api/generated/main/model/kills-controller-get-member-kills-npc-types-item";
import type { KillsControllerGetNpcKillersParams } from "@/lib/api/generated/main/model/kills-controller-get-npc-killers-params";
import type { LootsControllerGetLootStatsParams } from "@/lib/api/generated/main/model/loots-controller-get-loot-stats-params";
import type { LootsControllerGetLootStatsPeriod } from "@/lib/api/generated/main/model/loots-controller-get-loot-stats-period";
import type { NpcType } from "@/lib/api/generated/main/model/npc-type";

export const DEFAULT_MEMBER_KILLS_LIMIT = 40;
export const DEFAULT_NPC_KILLERS_LIMIT = 50;

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
}) =>
  withDefinedEntries({
    npcTypes: filters.npcTypes as
      | KillsControllerGetGuildKillStatsNpcTypesItem[]
      | undefined,
    minLvl: filters.minLvl,
    maxLvl: filters.maxLvl,
    world: filters.world,
  }) as KillsControllerGetGuildKillStatsParams | undefined;

export const buildGuildTopNpcsParams = (filters: {
  limit: number;
  npcType?: NpcType;
  world?: string;
  search?: string;
  minLvl?: number;
  maxLvl?: number;
}) =>
  withDefinedEntries({
    limit: filters.limit,
    npcType: filters.npcType,
    world: filters.world,
    search: filters.search,
    minLvl: filters.minLvl === undefined ? undefined : String(filters.minLvl),
    maxLvl: filters.maxLvl === undefined ? undefined : String(filters.maxLvl),
  }) as unknown as KillsControllerGetGuildTopNpcsParams;

export const buildMemberKillsParams = (filters: {
  world?: string;
  npcTypes?: NpcType[];
  search?: string;
  limit?: number;
  cursor?: number;
  minLvl?: number;
  maxLvl?: number;
}) =>
  withDefinedEntries({
    world: filters.world,
    npcTypes: filters.npcTypes as
      | KillsControllerGetMemberKillsNpcTypesItem[]
      | undefined,
    search: filters.search,
    limit: filters.limit,
    cursor:
      filters.cursor === undefined || filters.cursor === 0
        ? undefined
        : filters.cursor,
    minLvl: filters.minLvl,
    maxLvl: filters.maxLvl,
  }) as unknown as KillsControllerGetMemberKillsParams;

export const buildNpcKillersParams = (
  filters: {
    limit?: number;
    world?: string;
  } = {},
) =>
  withDefinedEntries({
    limit: filters.limit ?? DEFAULT_NPC_KILLERS_LIMIT,
    world: filters.world,
  }) as KillsControllerGetNpcKillersParams;

export const buildLootStatsParams = (filters: {
  period: LootsControllerGetLootStatsPeriod;
  world?: string;
  npcTypes?: NpcType[];
  excludeColossus?: boolean;
}) =>
  withDefinedEntries({
    period: filters.period,
    world: filters.world,
    npcTypes: filters.npcTypes?.join(","),
    excludeColossus: filters.excludeColossus ?? undefined,
  }) as LootsControllerGetLootStatsParams | undefined;
