import { Schema } from "effect";

export const DeleteRoleSchema = Schema.Struct({
  guildId: Schema.String,
  id: Schema.String,
});
export type DeleteRoleDto = typeof DeleteRoleSchema.Type;
