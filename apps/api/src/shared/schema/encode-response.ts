import { Schema } from "effect";

export const encodeUnknownResponse = <
  S extends Schema.ConstraintEncoder<unknown>,
>(
  codec: S,
  value: unknown,
): S["Encoded"] => Schema.encodeUnknownSync(codec)(value);
