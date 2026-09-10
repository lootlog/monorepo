import { NpcType } from "@lootlog/client/main";

export const NPC_TYPE_NAMES: Record<NpcType, string> = {
  [NpcType.TITAN]: "Tytan",
  [NpcType.COLOSSUS]: "Kolos",
  [NpcType.HERO]: "Heros",
  [NpcType.EVENT_HERO]: "Heros eventowy",
  [NpcType.ELITE3]: "Elita III",
  [NpcType.ELITE2]: "Elita II",
  [NpcType.ELITE]: "Elita",
  [NpcType.NPC]: "NPC",
  [NpcType.COMMON]: "Zwykły",
};

export const NPC_TYPE_SORT_ORDER = [
  NpcType.TITAN,
  NpcType.COLOSSUS,
  NpcType.HERO,
  NpcType.ELITE3,
  NpcType.ELITE2,
  NpcType.ELITE,
];

export const ITEM_RARITY_NAMES = new Map([
  ["LEGENDARY", "Legendarny"],
  ["HEROIC", "Heroiczny"],
  ["UNIQUE", "Unikatowy"],
  ["UPGRADED", "Ulepszony"],
  ["COMMON", "Zwykły"],
]);

export const findNpcType = (value: string | null) =>
  Object.values(NpcType).find((type) => type === value);

export const getNpcTypeName = (value: string) => {
  const type = findNpcType(value);

  return type ? NPC_TYPE_NAMES[type] : value;
};
