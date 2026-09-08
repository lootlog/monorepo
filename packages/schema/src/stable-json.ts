import { isRecord } from "./records.js";

export const stableJsonStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, entry) =>
    isRecord(entry)
      ? Object.fromEntries(
          Object.keys(entry)
            .sort()
            .map((key) => [key, entry[key]]),
        )
      : entry,
  ) ?? "undefined";
