import { Schema } from "effect";

export const UpdateBattleSchema = Schema.Struct({
  public: Schema.Boolean,
});

export type UpdateBattleDto = typeof UpdateBattleSchema.Type;
