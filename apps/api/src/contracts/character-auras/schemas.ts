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
  auras: Schema.Array(CharacterAuraResponse),
  canChange: Schema.Boolean,
  personalAuraIds: Schema.Array(PersonalCharacterAuraIdSchema),
  canGrant: Schema.Boolean,
}).annotate({ identifier: "OwnCharacterAuraResponseDto" });

export type OwnCharacterAuraResponse = typeof OwnCharacterAuraResponse.Type;

export const UpdateOwnCharacterAuraRequest = Schema.Struct({
  gameAccountId: MargonemId,
  characterId: MargonemId,
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
