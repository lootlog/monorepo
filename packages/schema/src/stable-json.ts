export const stableJsonStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, entry) =>
    entry && typeof entry === "object" && !Array.isArray(entry)
      ? Object.keys(entry)
          .sort()
          .reduce<Record<string, unknown>>((sorted, key) => {
            sorted[key] = entry[key];
            return sorted;
          }, {})
      : entry,
  ) ?? "undefined";
