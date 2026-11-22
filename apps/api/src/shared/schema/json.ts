import { Schema } from "effect";

const UnknownJson = Schema.fromJsonString(Schema.Unknown);

export const decodeJsonUnknown = Schema.decodeUnknownSync(UnknownJson);

export type BoundaryDecoder<A> = (value: unknown) => A;
