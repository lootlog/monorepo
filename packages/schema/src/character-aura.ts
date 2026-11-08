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
  "conqueror",
  "heavenly",
  "halo",
  "dragon",
  "crown",
  "wings",
  "hearts",
] as const;

export const CharacterAuraIdSchema = Schema.Literals(CHARACTER_AURA_IDS);

export type CharacterAuraId = typeof CharacterAuraIdSchema.Type;

/**
 * Which auras a device draws on the map: all of them, the hero's and the few
 * nearest it, or none. `auto` draws all with graphics acceleration and the
 * nearest ones without it.
 */
export const MAP_AURA_MODES = ["auto", "all", "nearby", "off"] as const;

export type MapAuraMode = (typeof MAP_AURA_MODES)[number];

/**
 * The auras now shown on Margonem accounts after a User changed theirs; a
 * `null` aura means the account shows none. Ids stay plain strings so a Game
 * client that does not know a newer aura skips it instead of rejecting the
 * whole realtime frame, which closes its connection.
 */
export const CharacterAurasChangedSchema = Schema.Struct({
  auras: Schema.Array(
    Schema.Struct({
      gameAccountId: Schema.NonEmptyString,
      auraId: Schema.NullOr(Schema.NonEmptyString),
    }),
  ),
});

export type CharacterAurasChanged = typeof CharacterAurasChangedSchema.Type;
