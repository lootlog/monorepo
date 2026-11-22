export type ItemStatEntry = {
  key: string;
  value: string | true;
};

const parseEntry = (entry: string): ItemStatEntry => {
  const separator = entry.indexOf("=");

  return separator === -1
    ? { key: entry, value: true }
    : { key: entry.slice(0, separator), value: entry.slice(separator + 1) };
};

export const parseItemStatEntries = (stat: string): ItemStatEntry[] =>
  stat.split(";").filter(Boolean).map(parseEntry);

export const itemStatValue = (
  stat: string,
  key: string,
): string | undefined => {
  let value: string | true | undefined;

  for (const entry of parseItemStatEntries(stat)) {
    if (entry.key === key) value = entry.value;
  }

  return value === true ? undefined : value;
};

export const hasItemStat = (stat: string, key: string) =>
  parseItemStatEntries(stat).some((entry) => entry.key === key);

export const withoutItemStat = (stat: string, key: string) =>
  stat
    .split(";")
    .filter((entry) => !entry || parseEntry(entry).key !== key)
    .join(";");

export const truncateAtSecondSeparator = (value: string) =>
  value.split("=")[0] ?? "";

export const itemStatRecord = (stat: string): Record<string, string> =>
  Object.fromEntries(
    parseItemStatEntries(stat).flatMap(({ key, value }) => {
      if (value === true) return [];

      const stored = truncateAtSecondSeparator(value);

      return key && stored ? [[key, stored] as const] : [];
    }),
  );

const ITEM_INSTANCE_STAT_KEYS: ReadonlySet<string> = new Set([
  "created",
  "gold",
  "amount",
  "opis",
]);

export const splitItemStat = (stat: string) => {
  const revision: string[] = [];
  const instance: string[] = [];

  for (const entry of stat.split(";")) {
    const { key } = parseEntry(entry);

    if (!key) continue;

    (ITEM_INSTANCE_STAT_KEYS.has(key) ? instance : revision).push(entry);
  }

  return {
    revision: revision.join(";"),
    instance: instance.length > 0 ? instance.join(";") : null,
  };
};

export const joinItemStat = (revision: string, instance: string | null) =>
  [revision, instance].filter(Boolean).join(";");
