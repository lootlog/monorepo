import { Schema } from "effect";

/**
 * Auras a Lootlog account can wear on its characters. The Game client owns how
 * each one looks; the server only stores and validates the id.
 */
export const CHARACTER_AURA_IDS = [
  "divine",
  "hellfire",
  "frost",
  "void",
  "storm",
  "venom",
  "bloodmoon",
  "astral",
  "prism",
  "spirit",
  "sakura",
  "sandstorm",
  "necro",
  "tide",
  "arcane",
  "aurora",
] as const;

export const CharacterAuraIdSchema = Schema.Literals(CHARACTER_AURA_IDS);

export type CharacterAuraId = typeof CharacterAuraIdSchema.Type;
