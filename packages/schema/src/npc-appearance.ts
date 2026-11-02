import { Schema } from "effect";

export const APPEARANCE_NPC_TYPES = [
  "ELITE",
  "ELITE2",
  "ELITE3",
  "HERO",
  "EVENT_HERO",
  "COLOSSUS",
  "TITAN",
  "HERO_TRACKER",
] as const;

const AppearanceNpcTypeSchema = Schema.Literals(APPEARANCE_NPC_TYPES);

export type AppearanceNpcType = typeof AppearanceNpcTypeSchema.Type;

export type NpcTypeColors = Record<AppearanceNpcType, string>;

const HexAppearanceColorSchema = Schema.String.check(
  Schema.isPattern(/^#[\dA-F]{6}$/i),
);

export const DEFAULT_NPC_TYPE_COLORS = {
  ELITE: "#84CC16",
  ELITE2: "#DB5ABA",
  ELITE3: "#A855F7",
  HERO: "#F98948",
  EVENT_HERO: "#EAB308",
  COLOSSUS: "#218380",
  TITAN: "#194894",
  HERO_TRACKER: "#10B981",
} as const satisfies NpcTypeColors;

export const isHexAppearanceColor = Schema.is(HexAppearanceColorSchema);

export const isAppearanceNpcType = Schema.is(AppearanceNpcTypeSchema);
