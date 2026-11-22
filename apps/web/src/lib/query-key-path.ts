import { Option, Schema } from "effect";

const decodePath = Schema.decodeUnknownOption(Schema.String);

export const getQueryKeyPath = (queryKey: readonly unknown[]) =>
  Option.getOrUndefined(decodePath(queryKey[0]));
