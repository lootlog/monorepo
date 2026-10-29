import { Link, createFileRoute } from "@tanstack/react-router";
import { useCatalogControllerGetNpcs } from "@lootlog/client/search";
import { Card, CardContent, CardHeader } from "@lootlog/ui/components/card";
import { NpcTile } from "@lootlog/ui/components/npc-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { BasicSearchForm } from "@/components/basic-search-form";
import { t } from "@/i18n/messages";
import { formatFirstSeenOn } from "@/lib/item-options";
import { useBasicSearchForm } from "./-use-basic-search-form";
import {
  getQueryRouteSearchParams,
  validateQueryRouteSearch,
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
  validateSearch: validateQueryRouteSearch,
});

function NpcsRoute() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const searchForm = useBasicSearchForm(search, navigate);

  const { search: query, limit } = getQueryRouteSearchParams(
    search,
    SEARCH_LIMIT,
  );

  // Without a name, the page lists the NPCs Lootlog saw first most recently.
  const { data, isError } = useCatalogControllerGetNpcs(
    { search: query, limit, sort: query ? "relevance" : "newest" },
    { query: { placeholderData: (previousData) => previousData } },
  );

  return (
    <div className="flex flex-col gap-4 py-6">
      <Card className="gap-4 p-4">
        <CardHeader className="px-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("npcs.title")}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("npcs.description")}
          </p>
        </CardHeader>
        <CardContent className="px-0">
          <BasicSearchForm {...searchForm} />
        </CardContent>
      </Card>

      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("catalog.loadError")}
        </p>
      ) : data?.hits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("search.noResults")}</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
          {data
            ? data.hits.map((npc) => (
                <li key={npc.key}>
                  <Link
                    to="/npcs/$npcKey"
                    params={{ npcKey: npc.key }}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    <NpcTile
                      npc={npc}
                      levelLabel={(level) => t("common.levelShort", { level })}
                    />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {npc.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {t(`npcTypes.${npc.type}`)} ·{" "}
                        {t("common.levelShort", { level: npc.lvl })}
                        {npc.firstSeenOn
                          ? ` · ${formatFirstSeenOn(npc.firstSeenOn)}`
                          : null}
                      </span>
                    </span>
                  </Link>
                </li>
              ))
            : Array.from({ length: 12 }, (_, index) => (
                <li key={index}>
                  <Skeleton className="h-[4.25rem] rounded-lg" />
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}
