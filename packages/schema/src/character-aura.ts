import { Schema } from "effect";

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
  "sovereign",
  "seraph",
  "eclipse",
  "thunderlord",
  "phoenix",
  "emperor",
  "quake",
  "starlight",
  "seal",
  "cosmos",
  "timelord",
  "winterlord",
  "architect",
  "absolute",
  "ascendant",
  "ascendant2",
  "ascendant3",
  "ascendant4",
  "skyborne",
  "joker",
  "nightowl",
  "sunder",
  "fortyfour",
  "thirteenth",
  "ninepins",
  "threefaces",
  "twineyes",
  "tulipwind",
] as const;

export const CharacterAuraIdSchema = Schema.Literals(CHARACTER_AURA_IDS);

export type CharacterAuraId = typeof CharacterAuraIdSchema.Type;

const ADMIN_CHARACTER_AURA_IDS = [
  "sovereign",
  "seraph",
  "eclipse",
  "thunderlord",
  "phoenix",
  "emperor",
  "quake",
  "starlight",
  "seal",
  "cosmos",
  "timelord",
  "winterlord",
  "architect",
  "absolute",
  "ascendant",
  "ascendant2",
  "ascendant3",
  "ascendant4",
] as const satisfies ReadonlyArray<CharacterAuraId>;

const adminCharacterAuraIds: ReadonlySet<string> = new Set(
  ADMIN_CHARACTER_AURA_IDS,
);

export const isAdminCharacterAuraId = (id: CharacterAuraId): boolean =>
  adminCharacterAuraIds.has(id);

export const PERSONAL_CHARACTER_AURA_IDS = [
  "skyborne",
  "joker",
  "nightowl",
  "sunder",
  "fortyfour",
  "thirteenth",
  "ninepins",
  "threefaces",
  "twineyes",
  "tulipwind",
] as const satisfies ReadonlyArray<CharacterAuraId>;

export const PersonalCharacterAuraIdSchema = Schema.Literals(
  PERSONAL_CHARACTER_AURA_IDS,
);

export type PersonalCharacterAuraId = typeof PersonalCharacterAuraIdSchema.Type;

const personalCharacterAuraIds: ReadonlySet<string> = new Set(
  PERSONAL_CHARACTER_AURA_IDS,
);

export const isPersonalCharacterAuraId = (
  id: CharacterAuraId,
): id is PersonalCharacterAuraId => personalCharacterAuraIds.has(id);

export const MAP_AURA_MODES = ["auto", "all", "nearby", "off"] as const;

export type MapAuraMode = (typeof MAP_AURA_MODES)[number];

export const CharacterAurasChangedSchema = Schema.Struct({
  auras: Schema.Array(
    Schema.Struct({
      gameAccountId: Schema.NonEmptyString,
      characterId: Schema.NonEmptyString,
      auraId: Schema.NullOr(Schema.NonEmptyString),
    }),
  ),
});

export type CharacterAurasChanged = typeof CharacterAurasChangedSchema.Type;

export const CharacterAuraGrants = Schema.Struct({
  admin: Schema.Boolean,
  granted: Schema.Boolean,
  personalAuraIds: Schema.Array(PersonalCharacterAuraIdSchema),
});

export type CharacterAuraGrants = typeof CharacterAuraGrants.Type;

export const CharacterAuraGrantHolders = Schema.Struct({
  holders: Schema.Array(
    Schema.Struct({
      userId: Schema.String,
      granted: Schema.Boolean,
      personalAuraIds: Schema.Array(PersonalCharacterAuraIdSchema),
    }),
  ),
});

export type CharacterAuraGrantHolders = typeof CharacterAuraGrantHolders.Type;
