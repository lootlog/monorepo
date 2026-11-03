import { NpcType } from "@lootlog/client/main";

/** Hero Trackers cannot be fought, so kills and loots never carry them. */
export type KilledNpcType = Exclude<NpcType, typeof NpcType.HERO_TRACKER>;

export const findNpcType = (value: string | null) =>
  Object.values(NpcType).find((type) => type === value);

const isKilledNpcType = (type: NpcType): type is KilledNpcType =>
  type !== NpcType.HERO_TRACKER;

/** The NPC types kill statistics filter by; Hero Trackers have no kills. */
export const KILLED_NPC_TYPES = Object.values(NpcType).filter(isKilledNpcType);

/** A kill statistics filter value; Hero Trackers have no kills to filter. */
export const findKilledNpcType = (value: string | null) =>
  KILLED_NPC_TYPES.find((type) => type === value);
