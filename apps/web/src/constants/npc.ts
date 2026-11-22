import { NpcType } from "@lootlog/client/main";

export type KilledNpcType = Exclude<NpcType, typeof NpcType.HERO_TRACKER>;

export const findNpcType = (value: string | null) =>
  Object.values(NpcType).find((type) => type === value);

const isKilledNpcType = (type: NpcType): type is KilledNpcType =>
  type !== NpcType.HERO_TRACKER;

export const KILLED_NPC_TYPES = Object.values(NpcType).filter(isKilledNpcType);

export const findKilledNpcType = (value: string | null) =>
  KILLED_NPC_TYPES.find((type) => type === value);
