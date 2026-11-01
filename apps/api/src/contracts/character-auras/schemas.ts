/** Input and output schemas for the auras Users wear on their characters. */
import { Schema } from "effect";
import { CharacterAuraIdSchema } from "@lootlog/schema/character-aura";

export const OwnCharacterAuraResponse = Schema.Struct({
  /** `null` while the User wears no aura. */
  auraId: Schema.NullOr(CharacterAuraIdSchema),
  /** Whether the User may choose an aura; removing one is always allowed. */
  canChange: Schema.Boolean,
  /** Margonem accounts other players see the aura on. */
  gameAccountIds: Schema.Array(Schema.String),
}).annotate({ identifier: "OwnCharacterAuraResponseDto" });

export type OwnCharacterAuraResponse = typeof OwnCharacterAuraResponse.Type;

export const UpdateOwnCharacterAuraRequest = Schema.Struct({
  auraId: Schema.NullOr(CharacterAuraIdSchema),
}).annotate({ identifier: "UpdateOwnCharacterAuraDto" });

export type UpdateOwnCharacterAuraRequest =
  typeof UpdateOwnCharacterAuraRequest.Type;

export const CharacterAuraGameAccountParams = Schema.Struct({
  gameAccountId: Schema.String.check(Schema.isPattern(/^[1-9]\d{0,19}$/)),
});

export const CharacterAuraResponse = Schema.Struct({
  gameAccountId: Schema.String,
  auraId: CharacterAuraIdSchema,
}).annotate({ identifier: "CharacterAuraResponseDto" });

export const CharacterAurasResponse = Schema.Struct({
  auras: Schema.Array(CharacterAuraResponse),
}).annotate({ identifier: "CharacterAurasResponseDto" });

export type CharacterAurasResponse = typeof CharacterAurasResponse.Type;
