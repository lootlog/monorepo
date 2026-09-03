import { KillsControllerGetUserKillStatsNpcTypesItem } from "@lootlog/client/main";
import type { KillsControllerGetUserKillStatsNpcTypesItem as NpcType } from "@lootlog/client/main";

export type { NpcType };

export const TRACKABLE_NPC_TYPES: NpcType[] = [
  KillsControllerGetUserKillStatsNpcTypesItem.TITAN,
  KillsControllerGetUserKillStatsNpcTypesItem.COLOSSUS,
  KillsControllerGetUserKillStatsNpcTypesItem.HERO,
  KillsControllerGetUserKillStatsNpcTypesItem.ELITE3,
  KillsControllerGetUserKillStatsNpcTypesItem.ELITE2,
];
