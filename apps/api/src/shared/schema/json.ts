import { Schema } from "effect";

const UnknownJson = Schema.fromJsonString(Schema.Unknown);

/** Decode JSON syntax without asserting a domain type at the serialization boundary. */
export const decodeJsonUnknown = Schema.decodeUnknownSync(UnknownJson);
