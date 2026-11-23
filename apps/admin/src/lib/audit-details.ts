import { Predicate, type Schema } from "effect";

export const formatAuditDetails = (
  details: Readonly<Record<string, Schema.Json>> | null,
) =>
  Object.entries(details ?? {})
    .map(
      ([key, value]) =>
        `${key}: ${Predicate.isString(value) ? value : JSON.stringify(value)}`,
    )
    .join(" · ");
