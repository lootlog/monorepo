export const uniqueWorlds = (worlds: ReadonlyArray<string>) =>
  [...new Set(worlds.filter(Boolean))].sort((first, second) =>
    first.localeCompare(second),
  );
