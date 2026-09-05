import { type FormEvent, startTransition, useEffect, useState } from "react";
import {
  areBasicRouteSearchStatesEqual,
  emptyBasicRouteSearch,
  getBasicRouteSearchState,
  type BasicRouteSearch,
} from "./-search-route.utils";

const SEARCH_DEBOUNCE_MS = 300;
export const useBasicSearchForm = (
  search: BasicRouteSearch,
  navigate: (options: {
    search: BasicRouteSearch;
    replace?: boolean;
  }) => Promise<void>,
) => {
  const [queryValue, setQueryValue] = useState(search.query);
  const [worldValue, setWorldValue] = useState(search.world);
  useEffect(() => {
    setQueryValue(search.query);
    setWorldValue(search.world);
  }, [search.query, search.world]);

  useEffect(() => {
    const nextSearch = getBasicRouteSearchState({ queryValue, worldValue });

    if (
      areBasicRouteSearchStatesEqual(nextSearch, {
        query: search.query,
        world: search.world,
      })
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      startTransition(() => {
        void navigate({
          replace: true,
          search: nextSearch,
        });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [navigate, queryValue, search.query, search.world, worldValue]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      void navigate({
        search: getBasicRouteSearchState({ queryValue, worldValue }),
      });
    });
  }

  function handleReset() {
    setQueryValue("");
    setWorldValue("");

    startTransition(() => {
      void navigate({
        search: emptyBasicRouteSearch,
      });
    });
  }

  return {
    queryValue,
    setQueryValue,
    worldValue,
    setWorldValue,
    handleSubmit,
    handleReset,
  };
};
