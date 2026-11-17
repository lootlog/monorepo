/** Shared transport definitions for the activity HTTP contract. */
import { Schema } from "effect";
import { HttpApiSchema } from "effect/http-api";

export const AuthorizationUnavailable = Schema.Struct({
  message: Schema.String,
  statusCode: Schema.Literal(503),
}).pipe(HttpApiSchema.status(503));
