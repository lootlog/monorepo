export interface ThemePreviewLootFixture {
  comments: number;
  itemCount: number;
  itemKey: "aurora" | "north" | "astratus";
  key: "maddok" | "nymphemonia" | "berserker";
  locationKey: "maddok" | "nymphemonia" | "berserker";
  npcIcon: string;
  npcKey: "maddok" | "nymphemonia" | "berserker";
  npcLevel: number;
  npcType: "TITAN" | "ELITE2";
  playerCount: number;
  playerKeys: Array<"wild" | "agar" | "mira">;
  rarity: "LEGENDARY" | "HEROIC" | "UNIQUE";
  timeKey: "recent" | "hour" | "yesterday";
}

export const THEME_PREVIEW_LOOTS = [
  {
    comments: 3,
    itemCount: 3,
    itemKey: "aurora",
    key: "maddok",
    locationKey: "maddok",
    npcIcon: "tyt/maddok_magua-1b.gif",
    npcKey: "maddok",
    npcLevel: 284,
    npcType: "TITAN",
    playerCount: 3,
    playerKeys: ["wild", "agar", "mira"],
    rarity: "LEGENDARY",
    timeKey: "recent",
  },
  {
    comments: 0,
    itemCount: 2,
    itemKey: "north",
    key: "nymphemonia",
    locationKey: "nymphemonia",
    npcIcon: "e2/nymphemonia.gif",
    npcKey: "nymphemonia",
    npcLevel: 287,
    npcType: "ELITE2",
    playerCount: 2,
    playerKeys: ["wild", "agar"],
    rarity: "HEROIC",
    timeKey: "hour",
  },
  {
    comments: 1,
    itemCount: 4,
    itemKey: "astratus",
    key: "berserker",
    locationKey: "berserker",
    npcIcon: "e2/wl-mrozu03.gif",
    npcKey: "berserker",
    npcLevel: 300,
    npcType: "ELITE2",
    playerCount: 3,
    playerKeys: ["mira", "wild", "agar"],
    rarity: "UNIQUE",
    timeKey: "yesterday",
  },
] satisfies ThemePreviewLootFixture[];
