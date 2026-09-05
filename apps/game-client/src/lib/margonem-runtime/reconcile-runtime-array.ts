export function reconcileRuntimeArray<Item extends object>(
  current: readonly Item[],
  incoming: readonly Item[],
  fields: readonly (keyof Item)[],
): readonly Item[] {
  let changed = current.length !== incoming.length;
  const reconciled = incoming.map((item, index) => {
    const previous = current[index];
    if (previous && fields.every((field) => previous[field] === item[field])) {
      return previous;
    }
    changed = true;
    return Object.freeze({ ...item });
  });
  return changed ? Object.freeze(reconciled) : current;
}
