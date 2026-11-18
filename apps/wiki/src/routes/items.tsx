import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { Search, UserRound } from "lucide-react";
import { startTransition } from "react";
import { Button } from "@lootlog/ui/components/button";
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
import { ItemResults } from "@/components/items/item-results";
import { ItemsFilterPanel } from "@/components/items/items-filter-panel";
import { useDebouncedQuery } from "@/hooks/use-debounced-query";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";
import {
  effectiveSort,
  type ItemsSearch,
  joinList,
  SORT_OPTIONS,
  splitList,
  toCatalogParams,
  validateItemsSearch,
} from "@/lib/items-search";
import {
  itemResultsQueryOptions,
  prefetchPageQueries,
} from "@/lib/catalog-page-queries";
import { canonicalLink } from "@/lib/link-preview";
import { findMargonemWorld } from "@lootlog/domain/margonem-worlds";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

const LIST_FILTERS = [
  {
    key: "professions",
    label: (value: string) => t(`filters.professions.${value}`),
  },
  { key: "rarities", label: (value: string) => t(`itemRarity.${value}`) },
  {
    key: "bonuses",
    label: (value: string) => t(`legendaryBonus.${value}`),
  },
  { key: "bosses", label: (value: string) => t(`npcTypes.${value}`) },
  { key: "stats", label: (value: string) => t(`filters.statOptions.${value}`) },
  { key: "types", label: (value: string) => t(`itemType.${value}`) },
] as const;

type ActiveFilter = {
  key: string;
  label: string;
  clear: Partial<ItemsSearch>;
};

/** One removable chip per active filter, in the panel's order. */
const activeFilters = (search: ItemsSearch): ActiveFilter[] => [
  ...(search.slot
    ? [{ key: "slot", label: t(`slots.${search.slot}`), clear: { slot: "" } }]
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
  ...(search.world
    ? [
        {
          key: "world",
          label: t("filters.worldChip", {
            world: findMargonemWorld(search.world)?.name ?? search.world,
          }),
          clear: { world: "" },
        },
      ]
    : []),
  ...(search.events
    ? [
        {
          key: "events",
          label: t(`filters.eventOptions.${search.events}`),
          clear: { events: "" },
        },
      ]
    : []),
  ...LIST_FILTERS.flatMap(({ key, label }) => {
    const values = splitList(search[key]);

    return values.map((value) => ({
      key: `${key}-${value}`,
      label: label(value),
      clear: { [key]: joinList(values.filter((current) => current !== value)) },
    }));
  }),
];

export const Route = createFileRoute("/items")({
  component: ItemsRoute,
  loaderDeps: ({ search }) => ({ params: toCatalogParams(search) }),
  loader: ({ deps, context: { queryClient } }) =>
    prefetchPageQueries(
      queryClient.prefetchInfiniteQuery(itemResultsQueryOptions(deps.params)),
    ),
  head: () => ({
    meta: [{ title: `${t("meta.itemsTitle")} | ${t("meta.title")}` }],
    links: [canonicalLink("/items")],
  }),
  validateSearch: validateItemsSearch,
  // A link holds only the filters it sets.
  search: { middlewares: [stripSearchParams(EMPTY_ITEMS_SEARCH)] },
});

function ItemsRoute() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { set } = useEquipmentSet();

  const change = (update: Partial<ItemsSearch>) =>
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

  // The set's character as filters: its profession and what its level wears.
  const character = {
    professions: set.profession ?? "",
    maxLevel: set.level ?? undefined,
  };

  const hasCharacter = set.profession !== null || set.level !== null;

  const isForCharacter =
    hasCharacter &&
    search.professions === character.professions &&
    search.maxLevel === character.maxLevel;

  const panel = <ItemsFilterPanel search={search} onChange={change} />;

  return (
    <div className="grid items-start md:grid-cols-[17rem_minmax(0,1fr)]">
      <FiltersAside count={filters.length}>{panel}</FiltersAside>

      <div className="flex min-w-0 flex-col gap-4 py-6 md:pl-6">
        <h1 className="sr-only">{t("items.title")}</h1>

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
              placeholder={t("search.queryPlaceholder")}
            />
          </InputGroup>
          <Select
            value={effectiveSort(search)}
            onValueChange={(sort) => {
              if (sort !== null) change({ sort });
            }}
            items={SORT_OPTIONS.map((value) => ({
              value,
              label: t(`filters.sortOptions.${value}`),
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
              {SORT_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`filters.sortOptions.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasCharacter ? (
            <Button
              type="button"
              variant={isForCharacter ? "secondary" : "outline"}
              size="lg"
              aria-pressed={isForCharacter}
              title={t("filters.forCharacterTitle")}
              onClick={() =>
                change(
                  isForCharacter
                    ? { professions: "", maxLevel: undefined }
                    : character,
                )
              }
            >
              <UserRound aria-hidden="true" />
              <span className="max-sm:sr-only">
                {t("filters.forCharacter")}
              </span>
            </Button>
          ) : null}
          <FiltersSheet count={filters.length}>{panel}</FiltersSheet>
        </div>
        <ItemResults
          params={toCatalogParams(search)}
          query={search.query}
          filters={
            <ActiveFilterChips
              filters={filters.map((filter) => ({
                key: filter.key,
                label: filter.label,
                onRemove: () => change(filter.clear),
              }))}
              onClearAll={() =>
                change({ ...EMPTY_ITEMS_SEARCH, query: search.query })
              }
            />
          }
        />
      </div>
    </div>
  );
}
