import { Option, Schema } from "effect";

const decodePath = Schema.decodeUnknownOption(Schema.String);

/** The request path a generated query key starts with, if it has one. */
export const getQueryKeyPath = (queryKey: readonly unknown[]) =>
  Option.getOrUndefined(decodePath(queryKey[0]));
