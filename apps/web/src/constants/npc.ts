import { NpcType } from "@/hooks/api/game-data/use-npcs";

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

export const SPECIAL_NPC_TYPES = [
  NpcType.TITAN,
  NpcType.COLOSSUS,
  NpcType.HERO,
  NpcType.EVENT_HERO,
] as const;

export const ITEM_RARITY_NAMES: Record<string, string> = {
  LEGENDARY: "Legendarny",
  HEROIC: "Heroiczny",
  UNIQUE: "Unikatowy",
  UPGRADED: "Ulepszony",
  COMMON: "Zwykły",
};
