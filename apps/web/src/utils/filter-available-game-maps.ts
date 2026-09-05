export const filterAvailableGameMaps = <
  Map extends { id: number; name: string },
>(
  maps: Map[] | undefined,
  addedMapIds: ReadonlySet<number>,
  search: string,
): Map[] => {
  const normalizedSearch = search.toLowerCase();
  return (maps ?? [])
    .filter(
      (map) =>
        !addedMapIds.has(map.id) &&
        (map.name.toLowerCase().includes(normalizedSearch) ||
          map.id.toString().includes(search)),
    )
    .slice(0, 50);
};
