import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { useCatalogControllerGetItems } from "@lootlog/client/search";
import { Button } from "@lootlog/ui/components/button";
import { FilterChipButton } from "@lootlog/ui/components/filter-chip-button";
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
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@lootlog/ui/components/sheet";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { ItemsFilterPanel } from "@/components/items/items-filter-panel";
import { t } from "@/i18n/messages";
import {
  type ItemsSearch,
  joinList,
  SORT_OPTIONS,
  splitList,
  toCatalogParams,
  validateItemsSearch,
} from "@/lib/items-search";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

const SEARCH_DEBOUNCE_MS = 300;

const SEARCH_LIMIT = 96;

const LIST_FILTERS = [
  {
    key: "professions",
    label: (value: string) => t(`filters.professions.${value}`),
  },
  { key: "rarities", label: (value: string) => t(`itemRarity.${value}`) },
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
  ...(search.minLevel || search.maxLevel
    ? [
        {
          key: "level",
          label: t("filters.levelChip", {
            min: search.minLevel || "1",
            max: search.maxLevel || "∞",
          }),
          clear: { minLevel: "", maxLevel: "" },
        },
      ]
    : []),
  ...(search.recent
    ? [
        {
          key: "recent",
          label: t(`filters.recentOptions.${search.recent}`),
          clear: { recent: "" },
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
  head: () => ({
    meta: [{ title: `${t("meta.itemsTitle")} | ${t("meta.title")}` }],
  }),
  validateSearch: validateItemsSearch,
});

function ItemsRoute() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const [query, setQuery] = useState(search.query);

  const { data, isError } = useCatalogControllerGetItems(
    toCatalogParams(search, SEARCH_LIMIT),
    { query: { placeholderData: (previous) => previous } },
  );

  const change = (update: Partial<ItemsSearch>) =>
    startTransition(() => {
      void navigate({
        replace: true,
        search: (current) => ({ ...current, ...update }),
      });
    });

  useEffect(() => {
    setQuery(search.query);
  }, [search.query]);

  useEffect(() => {
    const nextQuery = query.trim();

    if (nextQuery === search.query) return;

    const timeoutId = setTimeout(() => {
      startTransition(() => {
        void navigate({
          replace: true,
          search: (current) => ({ ...current, query: nextQuery }),
        });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [navigate, query, search.query]);

  const filters = activeFilters(search);
  const panel = <ItemsFilterPanel search={search} onChange={change} />;

  return (
    <div className="grid items-start gap-6 py-6 md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside
        aria-label={t("filters.title")}
        className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto pr-1 md:block"
      >
        {panel}
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("items.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("items.description")}
          </p>
        </div>

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
            value={search.sort}
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
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="lg" className="md:hidden" />
              }
            >
              <SlidersHorizontal aria-hidden="true" />
              {t("filters.title")}
            </SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto p-4">
              <SheetTitle>{t("filters.title")}</SheetTitle>
              {panel}
            </SheetContent>
          </Sheet>
        </div>

        {filters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.map((filter) => (
              <FilterChipButton
                key={filter.key}
                removeLabel={t("filters.remove", { filter: filter.label })}
                onRemove={() => change(filter.clear)}
              >
                {filter.label}
              </FilterChipButton>
            ))}
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                change({ ...EMPTY_ITEMS_SEARCH, query: search.query })
              }
            >
              {t("filters.clearAll")}
            </Button>
          </div>
        ) : null}

        <section
          aria-labelledby="items-results"
          className="flex flex-col gap-3"
        >
          <h2
            id="items-results"
            className="text-sm font-semibold text-foreground"
          >
            {data
              ? t("search.results", { count: data.estimatedTotalHits })
              : t("search.loading")}
          </h2>
          <CatalogItemGrid
            items={data?.hits}
            isError={isError}
            placeholders={12}
            emptyLabel={t("search.noResults")}
          />
        </section>
      </div>
    </div>
  );
}
