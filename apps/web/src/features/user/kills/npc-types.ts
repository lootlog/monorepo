import { KillsControllerGetUserKillStatsNpcTypesItem } from "@lootlog/api-client/models/main/kills-controller-get-user-kill-stats-npc-types-item";
import type { KillsControllerGetUserKillStatsNpcTypesItem as NpcType } from "@lootlog/api-client/models/main/kills-controller-get-user-kill-stats-npc-types-item";

export type { NpcType };

export const TRACKABLE_NPC_TYPES: NpcType[] = [
  KillsControllerGetUserKillStatsNpcTypesItem.TITAN,
  KillsControllerGetUserKillStatsNpcTypesItem.COLOSSUS,
  KillsControllerGetUserKillStatsNpcTypesItem.HERO,
  KillsControllerGetUserKillStatsNpcTypesItem.ELITE3,
  KillsControllerGetUserKillStatsNpcTypesItem.ELITE2,
];
