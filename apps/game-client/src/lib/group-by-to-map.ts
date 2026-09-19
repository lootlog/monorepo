/**
 * Groups values into a `Map`, preserving first-occurrence key order and input
 * order within each group.
 *
 * `Map.groupBy` would do this, but it is only Baseline since March 2024 while
 * the userscript bundle targets es2020 and ships no polyfill. es-toolkit's
 * `groupBy` returns a plain object, which reorders numeric-looking keys such as
 * Discord snowflakes.
 */
export const groupByToMap = <Value, Key>(
  values: readonly Value[],
  getKey: (value: Value) => Key,
): Map<Key, Value[]> => {
  const grouped = new Map<Key, Value[]>();

  for (const value of values) {
    const key = getKey(value);
    const group = grouped.get(key);

    if (group) group.push(value);
    else grouped.set(key, [value]);
  }

  return grouped;
};
