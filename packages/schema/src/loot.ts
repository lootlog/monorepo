import { Schema } from "effect";

export const LootSourceEnum = {
  LOOTBOX: "LOOTBOX",
  DIALOG: "DIALOG",
  FIGHT: "FIGHT",
} as const;

export type LootSourceEnum =
  (typeof LootSourceEnum)[keyof typeof LootSourceEnum];

export const LootSourceSchema = Schema.Literals([
  LootSourceEnum.LOOTBOX,
  LootSourceEnum.DIALOG,
  LootSourceEnum.FIGHT,
]);

export const LootShareSourceEnum = {
  NONE: "NONE",
  ITEM_OWNER: "ITEM_OWNER",
  CHAT_MESSAGE: "CHAT_MESSAGE",
} as const;

export type LootShareSourceEnum =
  (typeof LootShareSourceEnum)[keyof typeof LootShareSourceEnum];

export const LootShareSourceSchema = Schema.Literals([
  LootShareSourceEnum.NONE,
  LootShareSourceEnum.ITEM_OWNER,
  LootShareSourceEnum.CHAT_MESSAGE,
]);

export const ProfessionEnum = {
  WARRIOR: "WARRIOR",
  PALADIN: "PALADIN",
  HUNTER: "HUNTER",
  MAGE: "MAGE",
  BLADE_DANCER: "BLADE_DANCER",
  TRACKER: "TRACKER",
} as const;

export type ProfessionEnum =
  (typeof ProfessionEnum)[keyof typeof ProfessionEnum];

export const ProfessionSchema = Schema.Literals([
  ProfessionEnum.WARRIOR,
  ProfessionEnum.PALADIN,
  ProfessionEnum.HUNTER,
  ProfessionEnum.MAGE,
  ProfessionEnum.BLADE_DANCER,
  ProfessionEnum.TRACKER,
]);

export const ItemTypeEnum = {
  ONE_HAND_WEAPON: "ONE_HAND_WEAPON",
  TWO_HAND_WEAPON: "TWO_HAND_WEAPON",
  ONE_AND_HALF_HAND_WEAPON: "ONE_AND_HALF_HAND_WEAPON",
  DISTANCE_WEAPON: "DISTANCE_WEAPON",
  HELP_WEAPON: "HELP_WEAPON",
  WAND_WEAPON: "WAND_WEAPON",
  ORB_WEAPON: "ORB_WEAPON",
  ARMOR: "ARMOR",
  HELMET: "HELMET",
  BOOTS: "BOOTS",
  GLOVES: "GLOVES",
  RING: "RING",
  NECKLACE: "NECKLACE",
  SHIELD: "SHIELD",
  NEUTRAL: "NEUTRAL",
  CONSUME: "CONSUME",
  GOLD: "GOLD",
  KEYS: "KEYS",
  QUEST: "QUEST",
  RENEWABLE: "RENEWABLE",
  ARROWS: "ARROWS",
  TALISMAN: "TALISMAN",
  BOOK: "BOOK",
  BAG: "BAG",
  BLESS: "BLESS",
  UPGRADE: "UPGRADE",
  RECIPE: "RECIPE",
  COINAGE: "COINAGE",
  QUIVER: "QUIVER",
  OUTFITS: "OUTFITS",
  PETS: "PETS",
  TELEPORTS: "TELEPORTS",
} as const;

export type ItemTypeEnum = (typeof ItemTypeEnum)[keyof typeof ItemTypeEnum];

export const ItemTypeSchema = Schema.Literals([
  ItemTypeEnum.ONE_HAND_WEAPON,
  ItemTypeEnum.TWO_HAND_WEAPON,
  ItemTypeEnum.ONE_AND_HALF_HAND_WEAPON,
  ItemTypeEnum.DISTANCE_WEAPON,
  ItemTypeEnum.HELP_WEAPON,
  ItemTypeEnum.WAND_WEAPON,
  ItemTypeEnum.ORB_WEAPON,
  ItemTypeEnum.ARMOR,
  ItemTypeEnum.HELMET,
  ItemTypeEnum.BOOTS,
  ItemTypeEnum.GLOVES,
  ItemTypeEnum.RING,
  ItemTypeEnum.NECKLACE,
  ItemTypeEnum.SHIELD,
  ItemTypeEnum.NEUTRAL,
  ItemTypeEnum.CONSUME,
  ItemTypeEnum.GOLD,
  ItemTypeEnum.KEYS,
  ItemTypeEnum.QUEST,
  ItemTypeEnum.RENEWABLE,
  ItemTypeEnum.ARROWS,
  ItemTypeEnum.TALISMAN,
  ItemTypeEnum.BOOK,
  ItemTypeEnum.BAG,
  ItemTypeEnum.BLESS,
  ItemTypeEnum.UPGRADE,
  ItemTypeEnum.RECIPE,
  ItemTypeEnum.COINAGE,
  ItemTypeEnum.QUIVER,
  ItemTypeEnum.OUTFITS,
  ItemTypeEnum.PETS,
  ItemTypeEnum.TELEPORTS,
]);
