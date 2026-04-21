import {
  KillsControllerGetUserKillStatsNpcTypesItem,
  type KillsControllerGetUserKillStatsNpcTypesItem as NpcType,
} from "@/lib/api/generated/main/model";

export type { NpcType };

export const TRACKABLE_NPC_TYPES: NpcType[] = [
  KillsControllerGetUserKillStatsNpcTypesItem.TITAN,
  KillsControllerGetUserKillStatsNpcTypesItem.COLOSSUS,
  KillsControllerGetUserKillStatsNpcTypesItem.HERO,
  KillsControllerGetUserKillStatsNpcTypesItem.ELITE3,
  KillsControllerGetUserKillStatsNpcTypesItem.ELITE2,
];
