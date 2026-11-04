const parseSearchValue = (values: string[]) => {
  if (values.length > 1) {
    return values;
  }

  return values[0] ?? "";
};

export const parseSearch = (searchString: string) => {
  const normalizedSearch = searchString.startsWith("?")
    ? searchString.slice(1)
    : searchString;

  const searchParams = new URLSearchParams(normalizedSearch);
  // SAFETY: The null-prototype dictionary starts empty; this function only assigns URLSearchParams strings or string arrays.
  const parsedSearch = Object.create(null) as Record<string, string | string[]>;
  const seenKeys = new Set<string>();

  for (const key of searchParams.keys()) {
    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);

    const values = searchParams.getAll(key);
    parsedSearch[key] = parseSearchValue(values);
  }

  return parsedSearch;
};

type SearchValue = string | number | boolean | null | undefined;

// `null` and `undefined` drop the key instead of being written as text.
export const stringifySearch = (
  search: Record<string, SearchValue | readonly SearchValue[]>,
) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(search)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined) {
          continue;
        }

        searchParams.append(key, String(item));
      }

      continue;
    }

    searchParams.set(key, String(value));
  }

  const serializedSearch = searchParams.toString();

  return serializedSearch ? `?${serializedSearch}` : "";
};
