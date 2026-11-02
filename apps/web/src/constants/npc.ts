import { NpcType } from "@lootlog/client/main";

/** Hero Trackers cannot be fought, so kills and loots never carry them. */
export type KilledNpcType = Exclude<NpcType, typeof NpcType.HERO_TRACKER>;

/** Monster types, strongest first; an event hero ranks right after a hero. */
export const NPC_TYPES_STRONGEST_FIRST: readonly KilledNpcType[] = [
  NpcType.TITAN,
  NpcType.COLOSSUS,
  NpcType.HERO,
  NpcType.EVENT_HERO,
  NpcType.ELITE3,
  NpcType.ELITE2,
  NpcType.ELITE,
  NpcType.COMMON,
];

/** Strongest monsters first; NPCs and timers without a type last. */
export const getNpcTypeSortIndex = (type: string | null | undefined) => {
  const index = NPC_TYPES_STRONGEST_FIRST.findIndex(
    (npcType) => npcType === type,
  );

  return index === -1 ? NPC_TYPES_STRONGEST_FIRST.length : index;
};

export const findNpcType = (value: string | null) =>
  Object.values(NpcType).find((type) => type === value);

const isKilledNpcType = (type: NpcType): type is KilledNpcType =>
  type !== NpcType.HERO_TRACKER;

/** A kill statistics filter value; Hero Trackers have no kills to filter. */
export const findKilledNpcType = (value: string | null) =>
  Object.values(NpcType)
    .filter(isKilledNpcType)
    .find((type) => type === value);
