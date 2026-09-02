import { Schema } from "effect";

export const CreateRoleSchema = Schema.Struct({
  guildId: Schema.String,
  id: Schema.String,
  name: Schema.String,
  color: Schema.Number,
  position: Schema.Number,
  admin: Schema.Boolean,
});
export type CreateRoleDto = typeof CreateRoleSchema.Type;
