import { Schema } from "effect";

const UnknownJson = Schema.fromJsonString(Schema.Unknown);

/** Decode JSON syntax without asserting a domain type at the serialization boundary. */
export const decodeJsonUnknown = Schema.decodeUnknownSync(UnknownJson);

/** The same decoding as an Effect, failing with the `SchemaError`. */
export const decodeJsonUnknownEffect = Schema.decodeUnknownEffect(UnknownJson);

/** A parser accepts untrusted input and either establishes its result contract or throws. */
export type BoundaryDecoder<A> = (value: unknown) => A;
