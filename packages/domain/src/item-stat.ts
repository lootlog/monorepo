/**
 * Margonem item stats are `key=value` entries joined by `;`; an entry without
 * `=` is a flag such as `permbound`. An entry splits at its first `=`, so a
 * value keeps any further `=` it contains. When a key repeats, the last entry
 * wins, as in the game's own `parseItemStat`.
 */
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

/** Every entry in order, repeats included; empty entries are skipped. */
export const parseItemStatEntries = (stat: string): ItemStatEntry[] =>
  stat.split(";").filter(Boolean).map(parseEntry);

/** The value of `key`'s last entry; none when that entry is a flag or absent. */
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

/** Whether the stats hold `key`, as a flag or with a value. */
export const hasItemStat = (stat: string, key: string) =>
  parseItemStatEntries(stat).some((entry) => entry.key === key);

/** The stats without any entry of `key`, other entries kept as written. */
export const withoutItemStat = (stat: string, key: string) =>
  stat
    .split(";")
    .filter((entry) => !entry || parseEntry(entry).key !== key)
    .join(";");

/**
 * The game's client reads a value only up to a second `=`. Projections that
 * were persisted or indexed that way keep doing so, so their stored values
 * stay stable.
 */
export const truncateAtSecondSeparator = (value: string) =>
  value.split("=")[0] ?? "";

/**
 * Valued stats by key, as stored in an item revision's stats snapshot: flags
 * and empty values are left out, a repeated key keeps its last value, and a
 * value ends at a second `=`.
 */
export const itemStatRecord = (stat: string): Record<string, string> =>
  Object.fromEntries(
    parseItemStatEntries(stat).flatMap(({ key, value }) => {
      if (value === true) return [];

      const stored = truncateAtSecondSeparator(value);

      return key && stored ? [[key, stored] as const] : [];
    }),
  );

/**
 * These keys vary between instances of one item revision: creation time,
 * gold value, stack amount and a description that can carry per-instance
 * text. They are stored with the looted instance, never with the shared
 * revision.
 */
const ITEM_INSTANCE_STAT_KEYS: ReadonlySet<string> = new Set([
  "created",
  "gold",
  "amount",
  "opis",
]);

/**
 * Splits observed stats into the revision part shared by every instance and
 * the per-instance part, keeping each entry's text and order and dropping
 * entries without a key. `instance` is null when the observation has no
 * per-instance entries.
 */
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

/** Reassembles the stats of one looted instance from its two stored parts. */
export const joinItemStat = (revision: string, instance: string | null) =>
  [revision, instance].filter(Boolean).join(";");
