import { NpcType as ApiNpcType } from "@lootlog/client/main";
import type { KilledNpcType as NpcType } from "@/constants/npc";

export type { NpcType };

export const TRACKABLE_NPC_TYPES: NpcType[] = [
  ApiNpcType.TITAN,
  ApiNpcType.COLOSSUS,
  ApiNpcType.HERO,
  ApiNpcType.EVENT_HERO,
  ApiNpcType.ELITE3,
  ApiNpcType.ELITE2,
];

export const NPC_TYPES = Object.values(ApiNpcType).filter(
  (type): type is NpcType => type !== ApiNpcType.HERO_TRACKER,
);

export const findTrackableNpcType = (value: string) =>
  NPC_TYPES.find((type) => type === value);
