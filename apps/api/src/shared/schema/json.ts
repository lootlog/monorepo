import { Schema } from "effect";

const UnknownJson = Schema.fromJsonString(Schema.Unknown);

export const decodeJsonUnknown = Schema.decodeUnknownSync(UnknownJson);

export const decodeJsonUnknownEffect = Schema.decodeUnknownEffect(UnknownJson);

export type BoundaryDecoder<A> = (value: unknown) => A;
