import { useEffect, useEffectEvent, useState } from "react";

const SEARCH_DEBOUNCE_MS = 300;

export const useDebouncedQuery = (
  committed: string,
  onCommit: (query: string) => void,
) => {
  const [draft, setDraft] = useState({ committed, query: committed });
  const query = draft.committed === committed ? draft.query : committed;
  const commit = useEffectEvent(onCommit);

  const setQuery = (next: string) => setDraft({ committed, query: next });

  useEffect(() => {
    const next = query.trim();

    if (next === committed) return;

    const timeoutId = setTimeout(() => commit(next), SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [query, committed]);

  return [query, setQuery] as const;
};
