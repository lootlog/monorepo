import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, startTransition, useEffect, useState } from "react";
import { getRuntimeConfig } from "@/config/runtime-config";
import { t } from "@/i18n/messages";
import {
  getItemsControllerGetItemsQueryKey,
  useItemsControllerGetItems,
} from "@/lib/api/generated/search/items/items";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 50;
type SearchStatus = "error" | "idle" | "loading" | "ready";

type ItemsRouteSearch = {
  filter: string;
  query: string;
  world: string;
};

function validateSearch(search: Record<string, unknown>): ItemsRouteSearch {
  return {
    filter: typeof search.filter === "string" ? search.filter : "",
    query: typeof search.query === "string" ? search.query : "",
    world: typeof search.world === "string" ? search.world : "",
  };
}

export const Route = createFileRoute("/items")({
  component: ItemsRoute,
  head: () => ({
    meta: [
      {
        title: `${t("meta.itemsTitle")} | ${t("meta.title")}`,
      },
    ],
  }),
  loader: () => getRuntimeConfig(),
  validateSearch,
});

function ItemsRoute() {
  const navigate = Route.useNavigate();
  const { searchApiUrl } = Route.useLoaderData();
  const search = Route.useSearch();
  const [queryValue, setQueryValue] = useState(search.query);
  const [worldValue, setWorldValue] = useState(search.world);
  const [filterValue, setFilterValue] = useState(search.filter);
  const hasActiveSearch =
    search.query.trim() !== "" ||
    search.world.trim() !== "" ||
    search.filter.trim() !== "";
  const queryParams = {
    filter: search.filter.trim() || undefined,
    limit: SEARCH_LIMIT,
    search: search.query.trim() || undefined,
    world: search.world.trim() || undefined,
  };
  const itemsQuery = useItemsControllerGetItems(queryParams, {
    query: {
      enabled: hasActiveSearch,
      placeholderData: (previousData) => previousData,
      queryKey: getItemsControllerGetItemsQueryKey(queryParams),
    },
    request: {
      baseUrl: searchApiUrl,
    },
  });
  const data = hasActiveSearch ? itemsQuery.data : undefined;
  let status: SearchStatus = "ready";

  if (!hasActiveSearch) {
    status = "idle";
  } else if (itemsQuery.isError) {
    status = "error";
  } else if (itemsQuery.isPending) {
    status = "loading";
  }

  useEffect(() => {
    setQueryValue(search.query);
    setWorldValue(search.world);
    setFilterValue(search.filter);
  }, [search.filter, search.query, search.world]);

  useEffect(() => {
    const nextSearch = {
      filter: filterValue.trim(),
      query: queryValue.trim(),
      world: worldValue.trim(),
    };

    if (
      nextSearch.filter === search.filter &&
      nextSearch.query === search.query &&
      nextSearch.world === search.world
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
  }, [
    filterValue,
    navigate,
    queryValue,
    search.filter,
    search.query,
    search.world,
    worldValue,
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      void navigate({
        search: {
          filter: filterValue.trim(),
          query: queryValue.trim(),
          world: worldValue.trim(),
        },
      });
    });
  }

  function handleReset() {
    setQueryValue("");
    setWorldValue("");
    setFilterValue("");

    startTransition(() => {
      void navigate({
        search: {
          filter: "",
          query: "",
          world: "",
        },
      });
    });
  }

  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <section className="island-shell rounded-[2rem] px-6 py-8 sm:px-10">
        <p className="island-kicker mb-2">{t("items.eyebrow")}</p>
        <h1 className="display-title mb-3 text-4xl text-[var(--sea-ink)] sm:text-5xl">
          {t("items.title")}
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          {t("items.description")}
        </p>

        <form
          className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_0.8fr_1.6fr_auto_auto]"
          onSubmit={handleSubmit}
        >
          <label className="search-field">
            <span>{t("search.queryLabel")}</span>
            <input
              value={queryValue}
              onChange={(event) => setQueryValue(event.target.value)}
              placeholder={t("search.queryPlaceholder")}
            />
          </label>
          <label className="search-field">
            <span>{t("search.worldLabel")}</span>
            <input
              value={worldValue}
              onChange={(event) => setWorldValue(event.target.value)}
              placeholder={t("search.worldPlaceholder")}
            />
          </label>
          <label className="search-field">
            <span>{t("search.filterLabel")}</span>
            <input
              value={filterValue}
              onChange={(event) => setFilterValue(event.target.value)}
              placeholder={t("search.filterPlaceholder")}
            />
          </label>
          <button className="search-button" type="submit">
            {t("search.submit")}
          </button>
          <button
            className="search-button is-secondary"
            type="button"
            onClick={handleReset}
          >
            {t("search.reset")}
          </button>
        </form>

        <p className="mt-4 text-sm text-[var(--sea-ink-soft)]">
          {t("search.apiHint")}
        </p>
      </section>

      <section className="mt-8">
        {status === "idle" ? (
          <div className="state-card">{t("search.idle")}</div>
        ) : null}
        {status === "loading" ? (
          <div className="state-card">{t("search.loading")}</div>
        ) : null}
        {status === "error" ? (
          <div className="state-card is-error">{t("search.error")}</div>
        ) : null}
        {status === "ready" && data && data.hits.length === 0 ? (
          <div className="state-card">{t("search.noResults")}</div>
        ) : null}
        {status === "ready" && data && data.hits.length > 0 ? (
          <>
            <p className="mb-4 text-sm font-semibold text-[var(--sea-ink-soft)]">
              {t("search.results", { count: data.estimatedTotalHits })}
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.hits.map((item) => (
                <article
                  key={`${item.id}_${item.world}_${item.hid}`}
                  className="result-card"
                >
                  <div className="flex items-start gap-4">
                    {item.icon ? (
                      <img
                        alt={t("search.iconAlt", { name: item.name })}
                        className="h-14 w-14 rounded-xl border border-[var(--line)] bg-black/5 object-contain p-2"
                        src={item.icon}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-[var(--sea-ink)]">
                        {item.name}
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[var(--sea-ink-soft)]">
                        <span className="result-badge">
                          {t("items.levelLabel")}: {item.lvl}
                        </span>
                        {item.rarity ? (
                          <span className="result-badge">
                            {t("items.rarityLabel")}: {item.rarity}
                          </span>
                        ) : null}
                        {item.type ? (
                          <span className="result-badge">
                            {t("items.typeLabel")}: {item.type}
                          </span>
                        ) : null}
                        <span className="result-badge">{item.world}</span>
                      </div>
                    </div>
                  </div>

                  {item.stat ? (
                    <div className="mt-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sea-ink-soft)]">
                        {t("items.statsLabel")}
                      </p>
                      <p className="m-0 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm leading-7 text-[var(--sea-ink-soft)]">
                        {item.stat}
                      </p>
                    </div>
                  ) : null}

                  {item.requiredProfessions.length > 0 ? (
                    <p className="mt-4 text-sm text-[var(--sea-ink-soft)]">
                      {t("items.professionsLabel")}:{" "}
                      {item.requiredProfessions.join(", ")}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
