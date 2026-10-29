import { type FormEvent, startTransition, useEffect, useState } from "react";
import type { QueryRouteSearch } from "./-search-route.utils";

const SEARCH_DEBOUNCE_MS = 300;

/** A name search that follows the route's `query` and updates it as the User types. */
export const useBasicSearchForm = (
  search: QueryRouteSearch,
  navigate: (options: {
    search: QueryRouteSearch;
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
        void navigate({ replace: true, search: { query } });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [navigate, queryValue, search.query]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      void navigate({ search: { query: queryValue.trim() } });
    });
  }

  function handleReset() {
    setQueryValue("");

    startTransition(() => {
      void navigate({ search: { query: "" } });
    });
  }

  return { queryValue, setQueryValue, handleSubmit, handleReset };
};
