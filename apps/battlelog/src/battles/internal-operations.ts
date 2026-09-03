import { Schema } from "effect";

export const DeleteUserDataSchema = Schema.Struct({ userId: Schema.String });
export type DeleteUserData = typeof DeleteUserDataSchema.Type;
