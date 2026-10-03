import { Predicate } from "effect";
import { Base64Url } from "effect/encoding";

export const stableJsonStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, entry) =>
    Predicate.isObject(entry)
      ? Object.fromEntries(
          Object.keys(entry)
            .sort()
            .map((key) => [key, entry[key]]),
        )
      : entry,
  ) ?? "undefined";

/** Stable, URL-safe cache-key fragment for an arbitrary JSON value. */
export const stableJsonCacheKey = (value: unknown): string =>
  Base64Url.encode(stableJsonStringify(value));
