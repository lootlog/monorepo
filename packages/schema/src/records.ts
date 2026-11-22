import { Predicate } from "effect";

export const isObjectRecord = (
  value: unknown,
): value is Record<string, unknown> => Predicate.isObjectOrArray(value);
