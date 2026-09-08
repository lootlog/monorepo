import { Schema } from "effect";

/** Encodes and validates a value at an HTTP response boundary. */
export const encodeUnknownResponse = <
  S extends Schema.ConstraintEncoder<unknown>,
>(
  codec: S,
  value: unknown,
): S["Encoded"] => Schema.encodeUnknownSync(codec)(value);
