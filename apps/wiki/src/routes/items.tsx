import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal, UserRound } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
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
  SheetFooter,
  SheetTitle,
  SheetTrigger,
} from "@lootlog/ui/components/sheet";
import { ItemResults } from "@/components/items/item-results";
import { ItemsFilterPanel } from "@/components/items/items-filter-panel";
import { ItemsFiltersHeader } from "@/components/items/items-filters-header";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { set } = useEquipmentSet();

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

  // The set's character as filters: its profession and what its level wears.
  const character = {
    professions: set.profession ?? "",
    maxLevel: set.level === null ? "" : String(set.level),
  };

  const hasCharacter = set.profession !== null || set.level !== null;

  const isForCharacter =
    hasCharacter &&
    search.professions === character.professions &&
    search.maxLevel === character.maxLevel;

  const panel = <ItemsFilterPanel search={search} onChange={change} />;

  return (
    <div className="grid items-start gap-6 py-6 md:grid-cols-[17rem_minmax(0,1fr)]">
      <aside
        aria-label={t("filters.title")}
        className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-xl border border-border/50 bg-card md:flex"
      >
        <ItemsFiltersHeader count={filters.length} />
        <div className="min-h-0 overflow-y-auto px-3">{panel}</div>
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
                    ? { professions: "", maxLevel: "" }
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
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger
              render={
                <Button variant="outline" size="lg" className="md:hidden" />
              }
            >
              <SlidersHorizontal aria-hidden="true" />
              {t("filters.title")}
              {filters.length > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
                  {filters.length}
                </span>
              ) : null}
            </SheetTrigger>
            <SheetContent side="left" className="gap-0 bg-card p-0">
              <ItemsFiltersHeader
                count={filters.length}
                className="pr-12"
                renderTitle={(title) => (
                  <SheetTitle className="text-sm">{title}</SheetTitle>
                )}
              />
              <div className="min-h-0 flex-1 overflow-y-auto px-3">{panel}</div>
              <SheetFooter className="mt-0 border-t border-border/50 p-3">
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={() => setIsSheetOpen(false)}
                >
                  {t("filters.showResults")}
                </Button>
              </SheetFooter>
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

        <ItemResults params={toCatalogParams(search)} query={search.query} />
      </div>
    </div>
  );
}
