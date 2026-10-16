/** Whether any of the texts contains the phrase, ignoring case. */
export const matchesStatisticsQuery = (
  query: string | undefined,
  ...texts: string[]
) => {
  const phrase = query?.trim().toLocaleLowerCase("pl");

  return (
    !phrase ||
    texts.some((text) => text.toLocaleLowerCase("pl").includes(phrase))
  );
};
