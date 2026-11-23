import { Schema } from "effect";

const DeleteUserDataSchema = Schema.Struct({ userId: Schema.String });

export type DeleteUserData = typeof DeleteUserDataSchema.Type;
