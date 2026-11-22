import { PersonalCharacterAuraIdSchema } from "@lootlog/schema/character-aura";
import { Schema } from "effect";
import { GAME_ACCOUNT_ID } from "./margonem-account.js";

export const AuraAction = Schema.Union([
  Schema.Struct({ action: Schema.Literal("grant") }),
  Schema.Struct({
    action: Schema.Literal("grant-personal"),
    auraId: PersonalCharacterAuraIdSchema,
  }),
  Schema.Struct({ action: Schema.Literal("revoke") }),
]);

export type AuraAction = typeof AuraAction.Type;

export const AuraActionRequest = Schema.Struct({
  gameAccountId: Schema.String.check(Schema.isPattern(GAME_ACCOUNT_ID)),
  action: AuraAction,
});

export type AuraRefusal = "forbidden" | "no-player";
