import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, startTransition, useEffect, useState } from "react";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card, CardContent, CardHeader } from "@lootlog/ui/components/card";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Input } from "@lootlog/ui/components/input";
import { ItemRarity } from "@lootlog/ui/components/item-image";
import { ItemTile } from "@lootlog/ui/components/item-tile";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { getRuntimeConfig } from "@/config/runtime-config";
import { t } from "@/i18n/messages";
import {
  getItemsControllerGetItemsQueryKey,
  useItemsControllerGetItems,
} from "@lootlog/client/search";
import { renderItemStat } from "@/components/render-item-stat";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 96;
type SearchStatus = "error" | "idle" | "loading" | "ready";

type ItemsRouteSearch = {
  advancedFilter: string;
  maxLevel: string;
  minLevel: string;
  professions: string;
  query: string;
  rarities: string;
  sort: string;
  types: string;
  world: string;
};

const displayRarityOptions = [
  ItemRarity.COMMON,
  ItemRarity.UNIQUE,
  ItemRarity.HEROIC,
  ItemRarity.UPGRADED,
  ItemRarity.LEGENDARY,
] as const;

const rarityOptions = displayRarityOptions.filter(
  (rarity) => rarity !== ItemRarity.COMMON,
);

const professionOptions = ["w", "p", "h", "m", "b", "t"] as const;

const itemTypeOptions = [
  "ONE_HAND_WEAPON",
  "TWO_HAND_WEAPON",
  "ONE_AND_HALF_HAND_WEAPON",
  "DISTANCE_WEAPON",
  "HELP_WEAPON",
  "WAND_WEAPON",
  "ORB_WEAPON",
  "ARMOR",
  "HELMET",
  "BOOTS",
  "GLOVES",
  "RING",
  "NECKLACE",
  "SHIELD",
  "NEUTRAL",
  "CONSUME",
  "OUTFITS",
  "PETS",
  "TELEPORTS",
  "GOLD",
  "KEYS",
  "QUEST",
  "RENEWABLE",
  "BOOK",
  "BAG",
  "BLESS",
  "UPGRADE",
  "RECIPE",
  "COINAGE",
] as const;

const sortOptions = [
  "relevance",
  "lvl:asc",
  "lvl:desc",
  "name:asc",
  "name:desc",
  "rarity:asc",
  "type:asc",
] as const;

const isSortOption = (value: string): value is (typeof sortOptions)[number] =>
  sortOptions.includes(value as (typeof sortOptions)[number]);

const normalizeLevelValue = (value: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return undefined;
  }

  const level = Number(normalizedValue);

  if (!Number.isFinite(level)) {
    return undefined;
  }

  return Math.max(0, Math.floor(level));
};

function validateSearch(search: Record<string, unknown>): ItemsRouteSearch {
  return {
    advancedFilter:
      typeof search.advancedFilter === "string" ? search.advancedFilter : "",
    maxLevel: typeof search.maxLevel === "string" ? search.maxLevel : "",
    minLevel: typeof search.minLevel === "string" ? search.minLevel : "",
    professions:
      typeof search.professions === "string" ? search.professions : "",
    query: typeof search.query === "string" ? search.query : "",
    rarities: typeof search.rarities === "string" ? search.rarities : "",
    sort:
      typeof search.sort === "string" && isSortOption(search.sort)
        ? search.sort
        : "relevance",
    types: typeof search.types === "string" ? search.types : "",
    world: typeof search.world === "string" ? search.world : "",
  };
}

const splitSearchList = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const joinSearchList = (value: readonly string[]) => value.join(",");

const toggleSearchValue = (currentValue: string, nextValue: string) => {
  const currentValues = splitSearchList(currentValue);

  if (currentValues.includes(nextValue)) {
    return joinSearchList(
      currentValues.filter((currentValue) => currentValue !== nextValue),
    );
  }

  return joinSearchList([...currentValues, nextValue]);
};

const buildInFilter = (attribute: string, values: readonly string[]) => {
  if (values.length === 0) {
    return undefined;
  }

  return `${attribute} IN [${values.map((value) => JSON.stringify(value)).join(", ")}]`;
};

const buildFilters = (search: ItemsRouteSearch) => {
  const minLevel = normalizeLevelValue(search.minLevel);
  const maxLevel = normalizeLevelValue(search.maxLevel);
  const filters = [
    minLevel === undefined ? undefined : `lvl >= ${minLevel}`,
    maxLevel === undefined ? undefined : `lvl <= ${maxLevel}`,
    buildInFilter("rarity", splitSearchList(search.rarities)),
    buildInFilter("type", splitSearchList(search.types)),
    buildInFilter("requiredProfessions", splitSearchList(search.professions)),
    search.advancedFilter.trim() || undefined,
  ];

  return filters.filter((filter): filter is string => Boolean(filter));
};

const getSearchState = ({
  advancedFilterValue,
  maxLevelValue,
  minLevelValue,
  professionsValue,
  queryValue,
  raritiesValue,
  sortValue,
  typesValue,
  worldValue,
}: {
  advancedFilterValue: string;
  maxLevelValue: string;
  minLevelValue: string;
  professionsValue: string;
  queryValue: string;
  raritiesValue: string;
  sortValue: string;
  typesValue: string;
  worldValue: string;
}): ItemsRouteSearch => ({
  advancedFilter: advancedFilterValue.trim(),
  maxLevel: maxLevelValue.trim(),
  minLevel: minLevelValue.trim(),
  professions: professionsValue,
  query: queryValue.trim(),
  rarities: raritiesValue,
  sort: sortValue,
  types: typesValue,
  world: worldValue.trim(),
});

const itemSearchKeys: Array<keyof ItemsRouteSearch> = [
  "advancedFilter",
  "maxLevel",
  "minLevel",
  "professions",
  "query",
  "rarities",
  "sort",
  "types",
  "world",
];

const isSameSearchState = (
  first: ItemsRouteSearch,
  second: ItemsRouteSearch,
): boolean => itemSearchKeys.every((key) => first[key] === second[key]);

const getItemsSearchRequest = (search: ItemsRouteSearch, filters: string[]) => {
  const hasActiveSearch =
    search.query.trim() !== "" ||
    search.world.trim() !== "" ||
    filters.length > 0;

  return {
    hasActiveSearch,
    queryParams: {
      facets: ["rarity", "type"],
      filter: filters.length > 0 ? filters : undefined,
      limit: SEARCH_LIMIT,
      offset: 0,
      search: search.query.trim() || undefined,
      sort:
        search.sort && search.sort !== "relevance" ? [search.sort] : undefined,
      world: search.world.trim() || undefined,
    },
  };
};

const getSearchStatus = (
  hasActiveSearch: boolean,
  isError: boolean,
  isPending: boolean,
): SearchStatus => {
  if (!hasActiveSearch) return "idle";
  if (isError) return "error";
  if (isPending) return "loading";
  return "ready";
};

export const Route = createFileRoute("/items")({
  component: ItemsRoute,
  head: () => ({
    meta: [
      {
        title: `${t("meta.itemsTitle")} | ${t("meta.title")}`,
      },
    ],
  }),
  loader: () => getRuntimeConfig(),
  validateSearch,
});

function ItemsRoute() {
  const navigate = Route.useNavigate();
  const { searchApiUrl } = Route.useLoaderData();
  const search = Route.useSearch();
  const [queryValue, setQueryValue] = useState(search.query);
  const [worldValue, setWorldValue] = useState(search.world);
  const [minLevelValue, setMinLevelValue] = useState(search.minLevel);
  const [maxLevelValue, setMaxLevelValue] = useState(search.maxLevel);
  const [raritiesValue, setRaritiesValue] = useState(search.rarities);
  const [typesValue, setTypesValue] = useState(search.types);
  const [professionsValue, setProfessionsValue] = useState(search.professions);
  const [sortValue, setSortValue] = useState(search.sort || "relevance");
  const [advancedFilterValue, setAdvancedFilterValue] = useState(
    search.advancedFilter,
  );
  const filters = buildFilters(search);
  const { hasActiveSearch, queryParams } = getItemsSearchRequest(
    search,
    filters,
  );
  const itemsQuery = useItemsControllerGetItems(queryParams, {
    query: {
      enabled: hasActiveSearch,
      placeholderData: (previousData) => previousData,
      queryKey: getItemsControllerGetItemsQueryKey(queryParams),
    },
    request: {
      apiClient: {
        baseUrl: searchApiUrl,
      },
    },
  });
  const data = hasActiveSearch ? itemsQuery.data : undefined;
  const status = getSearchStatus(
    hasActiveSearch,
    itemsQuery.isError,
    itemsQuery.isPending,
  );

  useEffect(() => {
    setQueryValue(search.query);
    setWorldValue(search.world);
    setMinLevelValue(search.minLevel);
    setMaxLevelValue(search.maxLevel);
    setRaritiesValue(search.rarities);
    setTypesValue(search.types);
    setProfessionsValue(search.professions);
    setSortValue(search.sort || "relevance");
    setAdvancedFilterValue(search.advancedFilter);
  }, [
    search.advancedFilter,
    search.maxLevel,
    search.minLevel,
    search.professions,
    search.query,
    search.rarities,
    search.sort,
    search.types,
    search.world,
  ]);

  useEffect(() => {
    const nextSearch = getSearchState({
      advancedFilterValue,
      maxLevelValue,
      minLevelValue,
      professionsValue,
      queryValue,
      raritiesValue,
      sortValue,
      typesValue,
      worldValue,
    });

    if (isSameSearchState(nextSearch, search)) {
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
  }, [
    advancedFilterValue,
    maxLevelValue,
    minLevelValue,
    navigate,
    professionsValue,
    queryValue,
    raritiesValue,
    search.advancedFilter,
    search.maxLevel,
    search.minLevel,
    search.professions,
    search.query,
    search.rarities,
    search.sort,
    search.types,
    search.world,
    sortValue,
    typesValue,
    worldValue,
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      void navigate({
        search: getSearchState({
          advancedFilterValue,
          maxLevelValue,
          minLevelValue,
          professionsValue,
          queryValue,
          raritiesValue,
          sortValue,
          typesValue,
          worldValue,
        }),
      });
    });
  }

  function handleReset() {
    setQueryValue("");
    setWorldValue("");
    setMinLevelValue("");
    setMaxLevelValue("");
    setRaritiesValue("");
    setTypesValue("");
    setProfessionsValue("");
    setSortValue("relevance");
    setAdvancedFilterValue("");

    startTransition(() => {
      void navigate({
        search: {
          advancedFilter: "",
          maxLevel: "",
          minLevel: "",
          professions: "",
          query: "",
          rarities: "",
          sort: "relevance",
          types: "",
          world: "",
        },
      });
    });
  }

  const activeRarities = splitSearchList(raritiesValue);
  const activeTypes = splitSearchList(typesValue);
  const activeProfessions = splitSearchList(professionsValue);
  const itemLabels = {
    rarity: Object.fromEntries(
      displayRarityOptions.map((rarity) => [rarity, t(`itemRarity.${rarity}`)]),
    ),
    type: Object.fromEntries(
      itemTypeOptions.map((type) => [type, t(`itemType.${type}`)]),
    ),
    typePrefix: t("itemType.prefix"),
  };

  return (
    <main className="page-wrap overflow-x-hidden px-3 pb-10 pt-6">
      <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
        <CardHeader className="px-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                {t("items.eyebrow")}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("items.title")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {t("items.description")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {t("search.limitBadge", { count: SEARCH_LIMIT })}
              </Badge>
              {data ? (
                <Badge variant="outline">
                  {t("search.results", { count: data.estimatedTotalHits })}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <form className="grid gap-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.6fr_0.6fr_0.75fr_auto]">
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
              <Label className="grid gap-2">
                <span>{t("filters.minLevel")}</span>
                <Input
                  min={0}
                  type="number"
                  value={minLevelValue}
                  onChange={(event) => setMinLevelValue(event.target.value)}
                  placeholder={t("filters.minLevelPlaceholder")}
                />
              </Label>
              <Label className="grid gap-2">
                <span>{t("filters.maxLevel")}</span>
                <Input
                  min={0}
                  type="number"
                  value={maxLevelValue}
                  onChange={(event) => setMaxLevelValue(event.target.value)}
                  placeholder={t("filters.maxLevelPlaceholder")}
                />
              </Label>
              <Label className="grid gap-2">
                <span>{t("filters.sort")}</span>
                <Select
                  value={sortValue}
                  onValueChange={(value) => {
                    if (value !== null) setSortValue(value);
                  }}
                  items={[
                    ...sortOptions.map((sortOption) => ({
                      value: sortOption,
                      label: <>{t(`filters.sortOptions.${sortOption}`)}</>,
                    })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((sortOption) => (
                      <SelectItem key={sortOption} value={sortOption}>
                        {t(`filters.sortOptions.${sortOption}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Label>
              <div className="flex items-end gap-2">
                <Button className="w-full" type="submit">
                  {t("search.submit")}
                </Button>
                <Button
                  className="w-full"
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                >
                  {t("search.reset")}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1fr_1.6fr_1fr]">
              <div className="rounded-xl border border-border bg-background/35 p-3">
                <p className="mb-3 text-xs font-semibold text-muted-foreground">
                  {t("filters.rarity")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {rarityOptions.map((rarity) => (
                    <Label
                      key={rarity}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-2 py-1.5 text-xs"
                    >
                      <Checkbox
                        checked={activeRarities.includes(rarity)}
                        onCheckedChange={() =>
                          setRaritiesValue(
                            toggleSearchValue(raritiesValue, rarity),
                          )
                        }
                      />
                      {t(`itemRarity.${rarity}`)}
                    </Label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background/35 p-3">
                <p className="mb-3 text-xs font-semibold text-muted-foreground">
                  {t("filters.itemType")}
                </p>
                <ScrollArea className="h-24">
                  <div className="flex flex-wrap gap-2 pr-3">
                    {itemTypeOptions.map((type) => (
                      <Label
                        key={type}
                        className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-2 py-1.5 text-xs"
                      >
                        <Checkbox
                          checked={activeTypes.includes(type)}
                          onCheckedChange={() =>
                            setTypesValue(toggleSearchValue(typesValue, type))
                          }
                        />
                        {t(`itemType.${type}`)}
                      </Label>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="rounded-xl border border-border bg-background/35 p-3">
                <p className="mb-3 text-xs font-semibold text-muted-foreground">
                  {t("filters.profession")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {professionOptions.map((profession) => (
                    <Label
                      key={profession}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-2 py-1.5 text-xs"
                    >
                      <Checkbox
                        checked={activeProfessions.includes(profession)}
                        onCheckedChange={() =>
                          setProfessionsValue(
                            toggleSearchValue(professionsValue, profession),
                          )
                        }
                      />
                      {t(`filters.professions.${profession}`)}
                    </Label>
                  ))}
                </div>
              </div>
            </div>

            <Label className="grid gap-2">
              <span>{t("filters.advancedFilter")}</span>
              <Input
                value={advancedFilterValue}
                onChange={(event) => setAdvancedFilterValue(event.target.value)}
                placeholder={t("filters.advancedFilterPlaceholder")}
              />
            </Label>
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
        {status === "ready" && data && data.hits.length === 0 ? (
          <Card className="border-border bg-card/40 p-6 text-sm text-muted-foreground">
            {t("search.noResults")}
          </Card>
        ) : null}
        {status === "ready" && data && data.hits.length > 0 ? (
          <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-foreground">
                {t("search.results", { count: data.estimatedTotalHits })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("search.showingRange", {
                  end: data.hits.length,
                  start: 1,
                })}
              </p>
            </div>
            <div className="grid grid-flow-dense grid-cols-[repeat(auto-fill,minmax(42px,1fr))] gap-2">
              {data.hits.map((item) => (
                <div
                  key={item.id}
                  className="group flex min-h-12 items-center justify-center rounded-lg border border-border bg-background/40 p-1 transition-colors hover:border-primary/60 hover:bg-primary/5"
                >
                  <ItemTile
                    item={{
                      icon: item.icon,
                      name: item.name,
                      rarity:
                        item.rarity && item.rarity in ItemRarity
                          ? (item.rarity as ItemRarity)
                          : ItemRarity.COMMON,
                      stat: item.stat,
                      type: item.type,
                    }}
                    labels={itemLabels}
                    renderStat={renderItemStat}
                  />
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
