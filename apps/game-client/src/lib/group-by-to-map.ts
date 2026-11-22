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
