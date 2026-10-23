import { Schema } from "effect";

export const DeleteUserDataSchema = Schema.Struct({ userId: Schema.String });

export type DeleteUserData = typeof DeleteUserDataSchema.Type;

export const PvpWinsQuerySchema = Schema.Struct({
  afterBattleId: Schema.optional(Schema.String),
  since: Schema.String,
  before: Schema.String,
  limit: Schema.optional(Schema.NumberFromString),
});

export type PvpWinsQuery = typeof PvpWinsQuerySchema.Type;
