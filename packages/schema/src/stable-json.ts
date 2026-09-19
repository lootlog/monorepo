import { Encoding, Predicate } from "effect";

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
  Encoding.encodeBase64Url(stableJsonStringify(value));
