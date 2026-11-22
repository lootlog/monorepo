import { normalizeSearchText } from "@lootlog/domain/text-fold";

export const matchesStatisticsQuery = (
  query: string | undefined,
  ...texts: string[]
) => {
  const phrase = query && normalizeSearchText(query);

  return (
    !phrase || texts.some((text) => normalizeSearchText(text).includes(phrase))
  );
};
