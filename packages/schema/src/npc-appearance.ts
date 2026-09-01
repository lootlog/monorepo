import { Schema } from "effect";

export const COMBAT_NPC_TYPES = [
  "ELITE",
  "ELITE2",
  "ELITE3",
  "HERO",
  "EVENT_HERO",
  "COLOSSUS",
  "TITAN",
] as const;

export const CombatNpcTypeSchema = Schema.Literals(COMBAT_NPC_TYPES);
export type CombatNpcType = typeof CombatNpcTypeSchema.Type;
export type NpcTypeColors = Record<CombatNpcType, string>;

export const HexAppearanceColorSchema = Schema.String.check(
  Schema.isPattern(/^#[\dA-F]{6}$/i),
);
export const NpcTypeColorsSchema = Schema.Struct({
  ELITE: HexAppearanceColorSchema,
  ELITE2: HexAppearanceColorSchema,
  ELITE3: HexAppearanceColorSchema,
  HERO: HexAppearanceColorSchema,
  EVENT_HERO: HexAppearanceColorSchema,
  COLOSSUS: HexAppearanceColorSchema,
  TITAN: HexAppearanceColorSchema,
});

export const DEFAULT_NPC_TYPE_COLORS = {
  ELITE: "#84CC16",
  ELITE2: "#DB5ABA",
  ELITE3: "#A855F7",
  HERO: "#F98948",
  EVENT_HERO: "#EAB308",
  COLOSSUS: "#218380",
  TITAN: "#194894",
} as const satisfies NpcTypeColors;

export const isHexAppearanceColor = Schema.is(HexAppearanceColorSchema);
export const isCombatNpcType = Schema.is(CombatNpcTypeSchema);
