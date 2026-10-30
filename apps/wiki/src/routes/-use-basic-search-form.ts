import { type FormEvent, startTransition, useEffect, useState } from "react";
import type { QueryRouteSearch } from "./-search-route.utils";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * A name search that follows the route's `query` and updates it as the User
 * types, keeping the route's other filters.
 */
export const useBasicSearchForm = <Search extends QueryRouteSearch>(
  search: Search,
  navigate: (options: {
    search: (current: Search) => Search;
    replace?: boolean;
  }) => Promise<void>,
) => {
  const [queryValue, setQueryValue] = useState(search.query);

  useEffect(() => {
    setQueryValue(search.query);
  }, [search.query]);

  useEffect(() => {
    const query = queryValue.trim();

    if (query === search.query) {
      return;
    }

    const timeoutId = setTimeout(() => {
      startTransition(() => {
        void navigate({
          replace: true,
          search: (current) => ({ ...current, query }),
        });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [navigate, queryValue, search.query]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      void navigate({
        search: (current) => ({ ...current, query: queryValue.trim() }),
      });
    });
  }

  function handleReset() {
    setQueryValue("");

    startTransition(() => {
      void navigate({ search: (current) => ({ ...current, query: "" }) });
    });
  }

  return { queryValue, setQueryValue, handleSubmit, handleReset };
};
