import { Schema } from "effect";

export const UpdateRoleSchema = Schema.Struct({
  guildId: Schema.String,
  id: Schema.String,
  name: Schema.String,
  color: Schema.Number,
  position: Schema.Number,
  admin: Schema.Boolean,
});
export type UpdateRoleDto = typeof UpdateRoleSchema.Type;
