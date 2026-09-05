import { SearchResultsHeader } from "@/components/search-results-header";
import { SearchStatusCard } from "@/components/search-status-card";
import { BasicSearchForm } from "@/components/basic-search-form";
import { createFileRoute } from "@tanstack/react-router";
import { useBasicSearchForm } from "./-use-basic-search-form";
import { Badge } from "@lootlog/ui/components/badge";
import { Card, CardContent, CardHeader } from "@lootlog/ui/components/card";
import { NpcTile } from "@lootlog/ui/components/npc-tile";
import { getRuntimeConfig } from "@/config/runtime-config";
import { t } from "@/i18n/messages";
import {
  getNpcsControllerGetNpcsQueryKey,
  useNpcsControllerGetNpcs,
} from "@lootlog/client/search";
import {
  getBasicRouteSearchQueryParams,
  isBasicRouteSearchActive,
  type SearchStatus,
  validateBasicRouteSearch,
} from "./-search-route.utils";

const SEARCH_LIMIT = 72;

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
  validateSearch: validateBasicRouteSearch,
});

function NpcsRoute() {
  const navigate = Route.useNavigate();
  const { searchApiUrl } = Route.useLoaderData();
  const search = Route.useSearch();
  const searchForm = useBasicSearchForm(search, navigate);
  const hasActiveSearch = isBasicRouteSearchActive(search);
  const queryParams = getBasicRouteSearchQueryParams(search, SEARCH_LIMIT);
  const npcsQuery = useNpcsControllerGetNpcs(queryParams, {
    query: {
      enabled: hasActiveSearch,
      placeholderData: (previousData) => previousData,
      queryKey: getNpcsControllerGetNpcsQueryKey(queryParams),
    },
    request: {
      apiClient: {
        baseUrl: searchApiUrl,
      },
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
          <BasicSearchForm {...searchForm} />
        </CardContent>
      </Card>

      <section className="mt-4">
        <SearchStatusCard status={status} empty={data.length === 0} />
        {status === "ready" && data.length > 0 ? (
          <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
            <SearchResultsHeader
              count={data.length}
              start={1}
              end={data.length}
            />
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
