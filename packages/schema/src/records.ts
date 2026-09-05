import { Predicate } from "effect";

export const isRecord = Predicate.isObject;

/** Keeps property lookup available on legacy payloads, including arrays. */
export const isObjectRecord = (
  value: unknown,
): value is Record<string, unknown> => Predicate.isObjectOrArray(value);
