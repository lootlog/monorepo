import {
  KillsControllerGetUserKillStatsNpcTypesItem,
  type KillsControllerGetUserKillStatsNpcTypesItem as NpcType,
} from "@lootlog/client/main";

export type { NpcType };

export const TRACKABLE_NPC_TYPES: NpcType[] = [
  KillsControllerGetUserKillStatsNpcTypesItem.TITAN,
  KillsControllerGetUserKillStatsNpcTypesItem.COLOSSUS,
  KillsControllerGetUserKillStatsNpcTypesItem.HERO,
  KillsControllerGetUserKillStatsNpcTypesItem.ELITE3,
  KillsControllerGetUserKillStatsNpcTypesItem.ELITE2,
];

export const NPC_TYPES = Object.values(
  KillsControllerGetUserKillStatsNpcTypesItem,
);

export const findTrackableNpcType = (value: string) =>
  NPC_TYPES.find((type) => type === value);
