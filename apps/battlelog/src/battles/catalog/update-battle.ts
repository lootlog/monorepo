import { Schema } from "effect";

export const UpdateBattleSchema = Schema.Struct({
  public: Schema.Boolean,
});

export type BattleUpdate = typeof UpdateBattleSchema.Type;
