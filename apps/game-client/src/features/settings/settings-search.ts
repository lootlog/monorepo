export interface SettingsSearchItem {
  categoryId: string;
  categoryLabel: string;
  subsectionId: string;
  subsectionLabel: string;
  controlId: string;
  label: string;
  description?: string;
  keywords?: string[];
  order: number;
}

const normalizeSearchText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pl")
    .trim();

const isSingleEditApart = (left: string, right: string): boolean => {
  if (Math.abs(left.length - right.length) > 1) {
    return false;
  }

  if (left.length === right.length) {
    const differentIndexes: number[] = [];

    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) {
        differentIndexes.push(index);
      }

      if (differentIndexes.length > 2) {
        return false;
      }
    }

    if (differentIndexes.length <= 1) {
      return true;
    }

    const [firstIndex, secondIndex] = differentIndexes;
    return (
      secondIndex === firstIndex + 1 &&
      left[firstIndex] === right[secondIndex] &&
      left[secondIndex] === right[firstIndex]
    );
  }

  const [shorter, longer] =
    left.length < right.length ? [left, right] : [right, left];
  let shorterIndex = 0;
  let longerIndex = 0;
  let edits = 0;

  while (shorterIndex < shorter.length && longerIndex < longer.length) {
    if (shorter[shorterIndex] === longer[longerIndex]) {
      shorterIndex += 1;
      longerIndex += 1;
      continue;
    }

    edits += 1;
    longerIndex += 1;

    if (edits > 1) {
      return false;
    }
  }

  return true;
};

const getMatchScore = (
  item: SettingsSearchItem,
  normalizedQuery: string,
): number | undefined => {
  const searchableValues = [
    item.label,
    item.subsectionLabel,
    item.categoryLabel,
    item.description,
    ...(item.keywords ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeSearchText);

  if (searchableValues.some((value) => value === normalizedQuery)) {
    return 0;
  }

  if (searchableValues.some((value) => value.startsWith(normalizedQuery))) {
    return 1;
  }

  if (searchableValues.some((value) => value.includes(normalizedQuery))) {
    return 2;
  }

  const queryTokens = normalizedQuery.split(/\s+/);
  const searchableTokens = searchableValues.flatMap((value) =>
    value.split(/\s+/),
  );

  const everyTokenMatches = queryTokens.every((queryToken) =>
    searchableTokens.some((searchableToken) => {
      if (
        searchableToken === queryToken ||
        searchableToken.startsWith(queryToken) ||
        searchableToken.includes(queryToken)
      ) {
        return true;
      }

      return (
        queryToken.length >= 4 &&
        searchableToken.length >= 4 &&
        isSingleEditApart(searchableToken, queryToken)
      );
    }),
  );

  return everyTokenMatches ? 3 : undefined;
};

export const searchSettings = (
  items: SettingsSearchItem[],
  query: string,
): SettingsSearchItem[] => {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [];
  }

  return items
    .map((item) => ({ item, score: getMatchScore(item, normalizedQuery) }))
    .filter(
      (
        match,
      ): match is {
        item: SettingsSearchItem;
        score: number;
      } => match.score !== undefined,
    )
    .sort(
      (left, right) =>
        left.score - right.score || left.item.order - right.item.order,
    )
    .map(({ item }) => item);
};
