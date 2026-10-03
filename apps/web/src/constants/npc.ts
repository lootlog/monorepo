import { NpcType } from "@lootlog/client/main";

export const NPC_TYPE_SORT_ORDER = [
  NpcType.TITAN,
  NpcType.COLOSSUS,
  NpcType.HERO,
  NpcType.ELITE3,
  NpcType.ELITE2,
  NpcType.ELITE,
];

export const findNpcType = (value: string | null) =>
  Object.values(NpcType).find((type) => type === value);
