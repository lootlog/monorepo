import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, startTransition, useEffect, useState } from "react";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card, CardContent, CardHeader } from "@lootlog/ui/components/card";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { getRuntimeConfig } from "@/config/runtime-config";
import { t } from "@/i18n/messages";
import {
  getPlayersControllerGetPlayersQueryKey,
  usePlayersControllerGetPlayers,
} from "@/lib/api/generated/search/players/players";
import {
  areBasicRouteSearchStatesEqual,
  emptyBasicRouteSearch,
  getBasicRouteSearchQueryParams,
  getBasicRouteSearchState,
  isBasicRouteSearchActive,
  type SearchStatus,
  validateBasicRouteSearch,
} from "./-search-route.utils";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 72;

export const Route = createFileRoute("/players")({
  component: PlayersRoute,
  head: () => ({
    meta: [
      {
        title: `${t("meta.playersTitle")} | ${t("meta.title")}`,
      },
    ],
  }),
  loader: () => getRuntimeConfig(),
  validateSearch: validateBasicRouteSearch,
});

function PlayersRoute() {
  const navigate = Route.useNavigate();
  const { searchApiUrl } = Route.useLoaderData();
  const search = Route.useSearch();
  const [queryValue, setQueryValue] = useState(search.query);
  const [worldValue, setWorldValue] = useState(search.world);
  const hasActiveSearch = isBasicRouteSearchActive(search);
  const queryParams = getBasicRouteSearchQueryParams(search, SEARCH_LIMIT);
  const playersQuery = usePlayersControllerGetPlayers(queryParams, {
    query: {
      enabled: hasActiveSearch,
      placeholderData: (previousData) => previousData,
      queryKey: getPlayersControllerGetPlayersQueryKey(queryParams),
    },
    request: {
      baseUrl: searchApiUrl,
    },
  });
  const data = hasActiveSearch ? (playersQuery.data ?? []) : [];
  let status: SearchStatus = "ready";

  if (!hasActiveSearch) {
    status = "idle";
  } else if (playersQuery.isError) {
    status = "error";
  } else if (playersQuery.isPending) {
    status = "loading";
  }

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

  return (
    <main className="page-wrap overflow-x-hidden px-3 pb-10 pt-6">
      <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
        <CardHeader className="px-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                {t("players.eyebrow")}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("players.title")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {t("players.description")}
              </p>
            </div>
            <Badge variant="secondary">
              {t("search.limitBadge", { count: SEARCH_LIMIT })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <form
            className="grid gap-3 md:grid-cols-[1.6fr_1fr_auto_auto]"
            onSubmit={handleSubmit}
          >
            <Label className="grid gap-2">
              <span>{t("search.queryLabel")}</span>
              <Input
                value={queryValue}
                onChange={(event) => setQueryValue(event.target.value)}
                placeholder={t("search.queryPlaceholder")}
              />
            </Label>
            <Label className="grid gap-2">
              <span>{t("search.worldLabel")}</span>
              <Input
                value={worldValue}
                onChange={(event) => setWorldValue(event.target.value)}
                placeholder={t("search.worldPlaceholder")}
              />
            </Label>
            <Button className="self-end" type="submit">
              {t("search.submit")}
            </Button>
            <Button
              className="self-end"
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              {t("search.reset")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="mt-4">
        {status === "idle" ? (
          <Card className="border-border bg-card/40 p-6 text-sm text-muted-foreground">
            {t("search.idle")}
          </Card>
        ) : null}
        {status === "loading" ? (
          <Card className="border-border bg-card/40 p-6 text-sm text-muted-foreground">
            {t("search.loading")}
          </Card>
        ) : null}
        {status === "error" ? (
          <Card className="border-destructive/40 bg-card/40 p-6 text-sm text-destructive">
            {t("search.error")}
          </Card>
        ) : null}
        {status === "ready" && data.length === 0 ? (
          <Card className="border-border bg-card/40 p-6 text-sm text-muted-foreground">
            {t("search.noResults")}
          </Card>
        ) : null}
        {status === "ready" && data.length > 0 ? (
          <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-foreground">
                {t("search.results", { count: data.length })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("search.showingRange", { end: data.length, start: 1 })}
              </p>
            </div>
            <div className="grid grid-flow-dense grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {data.map((player) => (
                <article
                  key={`${player.id}_${player.world}`}
                  className="rounded-xl border border-border bg-background/40 p-3"
                >
                  <h2 className="truncate text-sm font-semibold text-foreground">
                    {player.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">
                      {player.prof || t("search.missingValue")}
                    </Badge>
                    <Badge variant="secondary">{player.world}</Badge>
                    <Badge variant="outline">
                      {t("players.characterIdLabel")}: {player.characterId}
                    </Badge>
                  </div>
                </article>
              ))}
            </div>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
