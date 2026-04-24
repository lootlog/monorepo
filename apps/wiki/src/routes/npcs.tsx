import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, startTransition, useEffect, useState } from "react";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card, CardContent, CardHeader } from "@lootlog/ui/components/card";
import { Input } from "@lootlog/ui/components/input";
import { NpcTile } from "@lootlog/ui/components/npc-tile";
import { Label } from "@lootlog/ui/components/label";
import { getRuntimeConfig } from "@/config/runtime-config";
import { t } from "@/i18n/messages";
import {
  getNpcsControllerGetNpcsQueryKey,
  useNpcsControllerGetNpcs,
} from "@/lib/api/generated/search/npcs/npcs";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 72;
type SearchStatus = "error" | "idle" | "loading" | "ready";

type NpcsRouteSearch = {
  query: string;
  world: string;
};

function validateSearch(search: Record<string, unknown>): NpcsRouteSearch {
  return {
    query: typeof search.query === "string" ? search.query : "",
    world: typeof search.world === "string" ? search.world : "",
  };
}

export const Route = createFileRoute("/npcs")({
  component: NpcsRoute,
  head: () => ({
    meta: [
      {
        title: `${t("meta.npcsTitle")} | ${t("meta.title")}`,
      },
    ],
  }),
  loader: () => getRuntimeConfig(),
  validateSearch,
});

function NpcsRoute() {
  const navigate = Route.useNavigate();
  const { searchApiUrl } = Route.useLoaderData();
  const search = Route.useSearch();
  const [queryValue, setQueryValue] = useState(search.query);
  const [worldValue, setWorldValue] = useState(search.world);
  const hasActiveSearch =
    search.query.trim() !== "" || search.world.trim() !== "";
  const queryParams = {
    limit: SEARCH_LIMIT,
    search: search.query.trim() || undefined,
    world: search.world.trim() || undefined,
  };
  const npcsQuery = useNpcsControllerGetNpcs(queryParams, {
    query: {
      enabled: hasActiveSearch,
      placeholderData: (previousData) => previousData,
      queryKey: getNpcsControllerGetNpcsQueryKey(queryParams),
    },
    request: {
      baseUrl: searchApiUrl,
    },
  });
  const data = hasActiveSearch ? (npcsQuery.data ?? []) : [];
  let status: SearchStatus = "ready";

  if (!hasActiveSearch) {
    status = "idle";
  } else if (npcsQuery.isError) {
    status = "error";
  } else if (npcsQuery.isPending) {
    status = "loading";
  }

  useEffect(() => {
    setQueryValue(search.query);
    setWorldValue(search.world);
  }, [search.query, search.world]);

  useEffect(() => {
    const nextSearch = {
      query: queryValue.trim(),
      world: worldValue.trim(),
    };

    if (
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
  }, [navigate, queryValue, search.query, search.world, worldValue]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      void navigate({
        search: {
          query: queryValue.trim(),
          world: worldValue.trim(),
        },
      });
    });
  }

  function handleReset() {
    setQueryValue("");
    setWorldValue("");

    startTransition(() => {
      void navigate({
        search: {
          query: "",
          world: "",
        },
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
                {t("npcs.eyebrow")}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("npcs.title")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {t("npcs.description")}
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
            <div className="grid grid-flow-dense grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              {data.map((npc) => (
                <article
                  key={`${npc.id}_${npc.world}_${npc.margonemType}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
                >
                  <NpcTile
                    levelLabel={(level) => t("common.levelShort", { level })}
                    npc={npc}
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-foreground">
                      {npc.name}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(`npcTypes.${npc.type}`)} · {npc.world}
                    </p>
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
