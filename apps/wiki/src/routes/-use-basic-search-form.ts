import { type FormEvent, startTransition, useEffect, useState } from "react";
import {
  areBasicRouteSearchStatesEqual,
  getBasicRouteSearchState,
  type BasicRouteSearch,
} from "./-search-route.utils";

const SEARCH_DEBOUNCE_MS = 300;

/** Shows the world field only when the route's search has `world`. */
export const useBasicSearchForm = <TSearch extends BasicRouteSearch>(
  search: TSearch,
  navigate: (options: { search: TSearch; replace?: boolean }) => Promise<void>,
) => {
  const routeWorld = "world" in search ? search.world : undefined;
  const [queryValue, setQueryValue] = useState(search.query);
  const [worldValue, setWorldValue] = useState(routeWorld ?? "");
  useEffect(() => {
    setQueryValue(search.query);
    setWorldValue(routeWorld ?? "");
  }, [search.query, routeWorld]);

  useEffect(() => {
    const nextSearch = getBasicRouteSearchState(search, {
      queryValue,
      worldValue,
    });

    if (areBasicRouteSearchStatesEqual(nextSearch, search)) {
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
  }, [navigate, queryValue, search, worldValue]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      void navigate({
        search: getBasicRouteSearchState(search, { queryValue, worldValue }),
      });
    });
  }

  function handleReset() {
    setQueryValue("");
    setWorldValue("");

    startTransition(() => {
      void navigate({
        search: getBasicRouteSearchState(search, {
          queryValue: "",
          worldValue: "",
        }),
      });
    });
  }

  return {
    queryValue,
    setQueryValue,
    hasWorldField: routeWorld !== undefined,
    worldValue,
    setWorldValue,
    handleSubmit,
    handleReset,
  };
};
