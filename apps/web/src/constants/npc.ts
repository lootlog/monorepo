import { NpcType } from "@lootlog/client/main";

const NPC_TYPE_SORT_ORDER: readonly string[] = [
  NpcType.TITAN,
  NpcType.COLOSSUS,
  NpcType.HERO,
  NpcType.ELITE3,
  NpcType.ELITE2,
  NpcType.ELITE,
];

/** Strongest monsters first; types without a rank, such as event heroes, last. */
export const getNpcTypeSortIndex = (type: string | null | undefined) => {
  const index = type ? NPC_TYPE_SORT_ORDER.indexOf(type) : -1;

  return index === -1 ? NPC_TYPE_SORT_ORDER.length : index;
};

export const findNpcType = (value: string | null) =>
  Object.values(NpcType).find((type) => type === value);
