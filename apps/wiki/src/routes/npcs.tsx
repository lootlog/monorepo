import { Link, createFileRoute } from "@tanstack/react-router";
import { useCatalogControllerGetNpcs } from "@lootlog/client/search";
import { Card, CardContent, CardHeader } from "@lootlog/ui/components/card";
import { NpcTile } from "@lootlog/ui/components/npc-tile";
import { NpcTypeIcon } from "@lootlog/ui/components/npc-type-icon";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { BasicSearchForm } from "@/components/basic-search-form";
import { CATALOG_GRID } from "@/components/catalog/catalog-item-grid";
import { FilterTile } from "@/components/filter-tile";
import { t } from "@/i18n/messages";
import { npcPageParams, WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { joinList, splitList } from "@/lib/items-search";
import { NPC_TYPE_ICONS, NPC_TYPE_OPTIONS } from "@/lib/npc-types";
import { useBasicSearchForm } from "./-use-basic-search-form";
import {
  getNpcsRouteSearchParams,
  validateNpcsRouteSearch,
} from "./-search-route.utils";

const SEARCH_LIMIT = 72;

// The catalog keeps no event heroes of their own, so the filter offers none.
const TYPE_FILTER_OPTIONS = NPC_TYPE_OPTIONS.filter(
  (type) => type !== "EVENT_HERO",
);

export const Route = createFileRoute("/npcs")({
  component: NpcsRoute,
  head: () => ({
    meta: [
      {
        title: `${t("meta.npcsTitle")} | ${t("meta.title")}`,
      },
    ],
  }),
  validateSearch: validateNpcsRouteSearch,
});

function NpcsRoute() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const searchForm = useBasicSearchForm(search, navigate);

  const {
    search: query,
    types,
    limit,
  } = getNpcsRouteSearchParams(search, SEARCH_LIMIT);

  const selectedTypes = splitList(search.types);

  const toggleType = (type: string) => (pressed: boolean) =>
    void navigate({
      replace: true,
      search: (current) => ({
        ...current,
        types: joinList(
          pressed
            ? [...selectedTypes, type]
            : selectedTypes.filter((selected) => selected !== type),
        ),
      }),
    });

  const { data, isError } = useCatalogControllerGetNpcs(
    {
      search: query,
      gameVersion: WIKI_GAME_VERSION,
      types,
      limit,
    },
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
        <CardContent className="flex flex-col gap-3 px-0">
          <BasicSearchForm {...searchForm} />
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
              {t("npcs.types")}
            </legend>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-1.5">
              {TYPE_FILTER_OPTIONS.map((type) => (
                <FilterTile
                  key={type}
                  label={t(`npcTypes.${type}`)}
                  icon={
                    <NpcTypeIcon
                      type={NPC_TYPE_ICONS[type]}
                      aria-hidden="true"
                      className="size-4"
                    />
                  }
                  pressed={selectedTypes.includes(type)}
                  onPressedChange={toggleType(type)}
                />
              ))}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("catalog.loadError")}
        </p>
      ) : data?.hits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("search.noResults")}</p>
      ) : (
        <ul className={CATALOG_GRID}>
          {data
            ? data.hits.map((npc) => (
                <li key={npc.key}>
                  <Link
                    to="/npcs/$npcSlug"
                    params={npcPageParams(npc)}
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
