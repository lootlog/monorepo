import { useEffect, useState } from "react";

const SEARCH_DEBOUNCE_MS = 300;

export const useDebouncedQuery = (
  committed: string,
  onCommit: (query: string) => void,
) => {
  const [query, setQuery] = useState(committed);

  useEffect(() => {
    setQuery(committed);
  }, [committed]);

  useEffect(() => {
    const next = query.trim();

    if (next === committed) return;

    const timeoutId = setTimeout(() => onCommit(next), SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [query, committed]);

  return [query, setQuery] as const;
};
