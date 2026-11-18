import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { startTransition } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@lootlog/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { ActiveFilterChips } from "@/components/common/active-filter-chips";
import { FiltersAside } from "@/components/common/filters-aside";
import { FiltersSheet } from "@/components/common/filters-sheet";
import { NpcResults } from "@/components/npcs/npc-results";
import { NpcsFilterPanel } from "@/components/npcs/npcs-filter-panel";
import { useDebouncedQuery } from "@/hooks/use-debounced-query";
import { t } from "@/i18n/messages";
import {
  npcResultsQueryOptions,
  prefetchPageQueries,
} from "@/lib/catalog-page-queries";
import { formatCatalogMonth } from "@/lib/catalog-days";
import { canonicalLink } from "@/lib/link-preview";
import {
  hasEventMonsters,
  isNpcFilterType,
  npcKindLabel,
} from "@/lib/npc-types";
import {
  effectiveNpcSort,
  NPC_SORT_OPTIONS,
  type NpcsSearch,
  toNpcCatalogParams,
  validateNpcsSearch,
} from "@/lib/npcs-search";
import { EMPTY_NPCS_SEARCH } from "@/navigation/wiki-navigation";

type ActiveFilter = {
  key: string;
  label: string;
  clear: Partial<NpcsSearch>;
};

/** One removable chip per active filter, in the panel's order. */
const activeFilters = (search: NpcsSearch): ActiveFilter[] => {
  const type = isNpcFilterType(search.types) ? search.types : undefined;

  return [
    ...(type
      ? [{ key: "types", label: npcKindLabel(type), clear: { types: "" } }]
      : []),
    ...(search.events && hasEventMonsters(type)
      ? [
          {
            key: "events",
            label: t(`filters.eventOptions.${search.events}`),
            clear: { events: "" as const },
          },
        ]
      : []),
    ...(search.minLevel !== undefined || search.maxLevel !== undefined
      ? [
          {
            key: "level",
            label: t("filters.levelChip", {
              min: search.minLevel ?? 1,
              max: search.maxLevel ?? "∞",
            }),
            clear: { minLevel: undefined, maxLevel: undefined },
          },
        ]
      : []),
    ...(search.firstSeen
      ? [
          {
            key: "firstSeen",
            label: t("npcs.firstSeenChip", {
              month: formatCatalogMonth(search.firstSeen),
            }),
            clear: { firstSeen: "" },
          },
        ]
      : []),
  ];
};

export const Route = createFileRoute("/npcs")({
  component: NpcsRoute,
  loaderDeps: ({ search }) => ({ params: toNpcCatalogParams(search) }),
  loader: ({ deps, context: { queryClient } }) =>
    prefetchPageQueries(
      queryClient.prefetchInfiniteQuery(npcResultsQueryOptions(deps.params)),
    ),
  head: () => ({
    meta: [{ title: `${t("meta.npcsTitle")} | ${t("meta.title")}` }],
    links: [canonicalLink("/npcs")],
  }),
  validateSearch: validateNpcsSearch,
  // A link holds only the filters it sets.
  search: { middlewares: [stripSearchParams(EMPTY_NPCS_SEARCH)] },
});

function NpcsRoute() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  const change = (update: Partial<NpcsSearch>) =>
    startTransition(() => {
      void navigate({
        replace: true,
        search: (current) => ({ ...current, ...update }),
      });
    });

  const [query, setQuery] = useDebouncedQuery(search.query, (next) =>
    change({ query: next }),
  );

  const filters = activeFilters(search);
  const panel = <NpcsFilterPanel search={search} onChange={change} />;

  return (
    <div className="grid items-start md:grid-cols-[17rem_minmax(0,1fr)]">
      <FiltersAside count={filters.length}>{panel}</FiltersAside>

      <div className="flex min-w-0 flex-col gap-4 py-6 md:pl-6">
        <h1 className="sr-only">{t("npcs.title")}</h1>

        <div className="flex flex-wrap items-center gap-2">
          <InputGroup size="lg" className="min-w-48 flex-1">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t("search.queryLabel")}
              placeholder={t("npcs.queryPlaceholder")}
            />
          </InputGroup>
          <Select
            value={effectiveNpcSort(search)}
            onValueChange={(sort) => {
              if (sort !== null) change({ sort });
            }}
            items={NPC_SORT_OPTIONS.map((value) => ({
              value,
              label: t(`npcs.sortOptions.${value}`),
            }))}
          >
            <SelectTrigger
              size="lg"
              className="w-44"
              aria-label={t("filters.sort")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NPC_SORT_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`npcs.sortOptions.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FiltersSheet count={filters.length}>{panel}</FiltersSheet>
        </div>
        <NpcResults
          params={toNpcCatalogParams(search)}
          query={search.query}
          filters={
            <ActiveFilterChips
              filters={filters.map((filter) => ({
                key: filter.key,
                label: filter.label,
                onRemove: () => change(filter.clear),
              }))}
              onClearAll={() =>
                change({ ...EMPTY_NPCS_SEARCH, query: search.query })
              }
            />
          }
        />
      </div>
    </div>
  );
}
