import { Schema } from "effect";

export const ItemRarityEnum = {
  UNIQUE: "UNIQUE",
  HEROIC: "HEROIC",
  LEGENDARY: "LEGENDARY",
  UPGRADED: "UPGRADED",
} as const;

export type ItemRarityEnum =
  (typeof ItemRarityEnum)[keyof typeof ItemRarityEnum];

export const ItemRaritySchema = Schema.Literals([
  ItemRarityEnum.UNIQUE,
  ItemRarityEnum.HEROIC,
  ItemRarityEnum.LEGENDARY,
  ItemRarityEnum.UPGRADED,
]);
