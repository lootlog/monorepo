import { Schema } from "effect";

/** Encodes and validates a value at an HTTP response boundary. */
export const encodeUnknownResponse = (
  codec: Schema.ConstraintEncoder<unknown>,
  value: unknown,
): unknown => Schema.encodeUnknownSync(codec)(value);
