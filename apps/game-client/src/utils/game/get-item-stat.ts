/**
 * The value of one `key=value` entry of a Margonem item `stat` string, such
 * as `rarity` or `reqp`; the last entry wins when a key repeats.
 */
export const getItemStat = (stat: string, key: string): string | undefined => {
  let value: string | undefined;

  for (const entry of stat.split(";")) {
    const [entryKey, entryValue] = entry.split("=");

    if (entryKey === key) value = entryValue;
  }

  return value;
};
