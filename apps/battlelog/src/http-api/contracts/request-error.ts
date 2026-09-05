import { Schema } from "effect";
import { HttpApiSchema } from "effect/unstable/httpapi";

export const BadRequestResponse = Schema.Struct({
  error: Schema.String,
  message: Schema.Union([
    Schema.String,
    Schema.Array(
      Schema.Struct({
        path: Schema.Array(Schema.Union([Schema.String, Schema.Number])),
        message: Schema.String,
      }),
    ),
  ]),
  statusCode: Schema.Literal(400),
}).pipe(HttpApiSchema.status(400));
