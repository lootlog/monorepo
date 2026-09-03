/** mutations transport definitions for battles. */
import * as Schema from "effect/Schema";

export type BattleDeletedResponseDto_Output = { readonly message: string };

export const BattleDeletedResponseDto_Output = Schema.Struct({
  message: Schema.String,
}).annotate({ identifier: "BattleDeletedResponseDto_Output" });

export type UpdateBattleDto = { readonly public: boolean };

export const UpdateBattleDto = Schema.Struct({
  public: Schema.Boolean,
}).annotate({ identifier: "UpdateBattleDto" });
