import { Link, createFileRoute } from "@tanstack/react-router";
import { useCatalogControllerGetNpcs } from "@lootlog/client/search";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { BasicSearchForm } from "@/components/basic-search-form";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { PageHeader } from "@/components/common/page-header";
import { FilterTile } from "@/components/filter-tile";
import { t } from "@/i18n/messages";
import { npcSummary } from "@/lib/npc-summary";
import { npcPageParams, WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { joinList, splitList } from "@/lib/items-search";
import { NPC_TYPE_OPTIONS } from "@/lib/npc-types";
import { useBasicSearchForm } from "./-use-basic-search-form";
import {
  getNpcsRouteSearchParams,
  validateNpcsRouteSearch,
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
    <div className="flex flex-col gap-6 py-6">
      <PageHeader title={t("npcs.title")} description={t("npcs.description")} />
      <div className="flex flex-col gap-4">
        <BasicSearchForm {...searchForm} />
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t("npcs.types")}
          </legend>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-1.5">
            {NPC_TYPE_OPTIONS.map((type) => (
              <FilterTile
                key={type}
                label={t(`npcTypes.${type}`)}
                pressed={selectedTypes.includes(type)}
                onPressedChange={toggleType(type)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("catalog.loadError")}
        </p>
      ) : data?.hits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("search.noResults")}</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
          {data
            ? data.hits.map((npc) => (
                <li key={npc.key}>
                  <Link
                    to="/npcs/$npcSlug"
                    params={npcPageParams(npc)}
                    className="group/npc flex h-full flex-col gap-2 rounded-xl border border-border/50 bg-card p-2 outline-none transition-[border-color,background-color] duration-150 hover:border-border hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    <NpcPortrait
                      key={npc.icon}
                      icon={npc.icon}
                      size="md"
                      className="w-full"
                    />
                    <span className="flex min-w-0 flex-col gap-0.5 px-1 pb-1">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {npc.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {npcSummary(npc)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))
            : Array.from({ length: 12 }, (_, index) => (
                <li key={index}>
                  <Skeleton className="h-[9.5rem] rounded-xl" />
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}
