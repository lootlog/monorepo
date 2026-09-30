/**
 * Margonem item stats are `key=value` entries joined by `;`. These keys vary
 * between instances of one item revision: creation time, gold value, stack
 * amount and a description that can carry per-instance text. They are stored
 * with the looted instance, never with the shared revision.
 */
export const ITEM_INSTANCE_STAT_KEYS: ReadonlySet<string> = new Set([
  "created",
  "gold",
  "amount",
  "opis",
]);

const statEntries = (stat: string) =>
  stat.split(";").filter((entry) => Boolean(entry.split("=")[0]));

/**
 * Splits observed stats into the revision part shared by every instance and
 * the per-instance part, keeping each entry's text and order. `instance` is
 * null when the observation has no per-instance entries.
 */
export const splitItemStat = (stat: string) => {
  const revision: string[] = [];
  const instance: string[] = [];

  for (const entry of statEntries(stat)) {
    const [key = ""] = entry.split("=");

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

/** Stats with a value, by key; a repeated key keeps its last value. */
export const parseItemStats = (stat: string) =>
  Object.fromEntries(
    stat.split(";").flatMap((entry) => {
      const [key, value] = entry.split("=");

      return key && value ? [[key, value] as const] : [];
    }),
  );
