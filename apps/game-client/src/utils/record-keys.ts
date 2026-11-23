export const recordKeys = <TRecord extends object>(
  record: TRecord,
): Extract<keyof TRecord, string>[] => {
  const keys: Extract<keyof TRecord, string>[] = [];

  for (const key in record) {
    if (Object.hasOwn(record, key)) keys.push(key);
  }

  return keys;
};
