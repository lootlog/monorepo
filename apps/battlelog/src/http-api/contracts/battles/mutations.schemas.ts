/** mutations transport definitions for battles. */
import * as Schema from "effect/Schema";

export type BattleDeletedResponseDto_Output =
  typeof BattleDeletedResponseDto_Output.Type;

export const BattleDeletedResponseDto_Output = Schema.Struct({
  message: Schema.String,
}).annotate({ identifier: "BattleDeletedResponseDto_Output" });

export type UpdateBattleDto = typeof UpdateBattleDto.Type;

export const UpdateBattleDto = Schema.Struct({
  public: Schema.Boolean,
}).annotate({ identifier: "UpdateBattleDto" });
