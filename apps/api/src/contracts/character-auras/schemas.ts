/** Input and output schemas for the auras Margonem characters wear. */
import { Schema } from "effect";
import {
  CharacterAuraIdSchema,
  PersonalCharacterAuraIdSchema,
} from "@lootlog/schema/character-aura";

const MargonemId = Schema.String.check(Schema.isPattern(/^[1-9]\d{0,19}$/));

const CharacterAuraResponse = Schema.Struct({
  gameAccountId: Schema.String,
  characterId: Schema.String,
  auraId: CharacterAuraIdSchema,
}).annotate({ identifier: "CharacterAuraResponseDto" });

export const OwnCharacterAuraResponse = Schema.Struct({
  /** The User's characters that wear an aura, each with its own. */
  auras: Schema.Array(CharacterAuraResponse),
  /** Whether the User may choose an aura; removing one is always allowed. */
  canChange: Schema.Boolean,
  /** The personal auras the User may choose; `canChange` does not cover them. */
  personalAuraIds: Schema.Array(PersonalCharacterAuraIdSchema),
  /** Whether the User may grant and revoke auras of other Users. */
  canGrant: Schema.Boolean,
}).annotate({ identifier: "OwnCharacterAuraResponseDto" });

export type OwnCharacterAuraResponse = typeof OwnCharacterAuraResponse.Type;

export const UpdateOwnCharacterAuraRequest = Schema.Struct({
  /** The Margonem account the character belongs to. */
  gameAccountId: MargonemId,
  characterId: MargonemId,
  /** `null` removes the character's aura. */
  auraId: Schema.NullOr(CharacterAuraIdSchema),
}).annotate({ identifier: "UpdateOwnCharacterAuraDto" });

export type UpdateOwnCharacterAuraRequest =
  typeof UpdateOwnCharacterAuraRequest.Type;

export const CharacterAuraGameAccountParams = Schema.Struct({
  gameAccountId: MargonemId,
});

export const PersonalCharacterAuraGrantParams = Schema.Struct({
  gameAccountId: MargonemId,
  auraId: PersonalCharacterAuraIdSchema,
});

export const CharacterAurasResponse = Schema.Struct({
  auras: Schema.Array(CharacterAuraResponse),
}).annotate({ identifier: "CharacterAurasResponseDto" });

export type CharacterAurasResponse = typeof CharacterAurasResponse.Type;
