/** Case-insensitive substring match of a mutes list query against an entry. */
export const matchesMuteSearch = (
  query: string,
  values: readonly string[],
): boolean => {
  const normalizedQuery = query.trim().toLocaleLowerCase("pl");

  return (
    !normalizedQuery ||
    values.some((value) =>
      value.toLocaleLowerCase("pl").includes(normalizedQuery),
    )
  );
};
