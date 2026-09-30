export const sortGuildsByPreference = <Guild extends { id: string }>(
  guilds: readonly Guild[],
  preferredIds: readonly string[],
): Guild[] => {
  const order = new Map(preferredIds.map((id, index) => [id, index]));

  return [...guilds].sort(
    (left, right) =>
      (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
};
