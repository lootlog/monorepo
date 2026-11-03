import { keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CircleAlert, Search, SearchX } from "lucide-react";
import { useState } from "react";
import {
  useCatalogControllerGetItems,
  useCatalogControllerGetNpcs,
} from "@lootlog/client/search";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { ITEM_RARITY_STYLES } from "@lootlog/ui/components/item-tile-details";
import { Kbd } from "@lootlog/ui/components/kbd";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import { HighlightedText } from "@/components/highlighted-text";
import { t } from "@/i18n/messages";
import {
  itemPageParams,
  npcPageParams,
  WIKI_GAME_VERSION,
} from "@/lib/catalog-links";
import { ITEM_TILE_LABELS } from "@/lib/item-options";
import {
  EMPTY_ITEMS_SEARCH,
  WIKI_NAVIGATION,
} from "@/navigation/wiki-navigation";

const MIN_QUERY_LENGTH = 2;

const HITS_PER_GROUP = 5;

const ROW_CLASS_NAME = "min-h-12 gap-3 rounded-lg px-2.5 py-1.5";

const sections = WIKI_NAVIGATION.filter(({ link }) => link.to !== "/");

type WikiSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Finds items and monsters by name as the User types. Each group offers its
 * full search page; before a query it lists the wiki's sections.
 */
export function WikiSearchDialog({
  open,
  onOpenChange,
}: WikiSearchDialogProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebounce(trimmedQuery, 150);
  const isSearching = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const showsHits = trimmedQuery.length >= MIN_QUERY_LENGTH;

  const queryOptions = {
    enabled: open && isSearching,
    placeholderData: keepPreviousData,
  };

  const items = useCatalogControllerGetItems(
    {
      search: debouncedQuery,
      gameVersion: WIKI_GAME_VERSION,
      limit: HITS_PER_GROUP,
    },
    { query: queryOptions },
  );

  const npcs = useCatalogControllerGetNpcs(
    {
      search: debouncedQuery,
      gameVersion: WIKI_GAME_VERSION,
      limit: HITS_PER_GROUP,
    },
    { query: queryOptions },
  );

  const itemHits = items.data?.hits ?? [];
  const npcHits = npcs.data?.hits ?? [];
  const isPending = items.isPending || npcs.isPending;

  const isFetching =
    items.isFetching || npcs.isFetching || debouncedQuery !== trimmedQuery;

  const hasError = items.isError && npcs.isError;

  // The rows in list order; the highlight falls back to the first one when
  // new hits replace the row it was on, so Enter always opens a visible row.
  const rowValues = showsHits
    ? [
        ...itemHits.map((item) => `item-${item.id}`),
        ...(itemHits.length > 0 ? ["items-all"] : []),
        ...npcHits.map((npc) => `npc-${npc.key}`),
        ...(npcHits.length > 0 ? ["npcs-all"] : []),
      ]
    : sections.map((section) => `section-${section.link.to}`);

  const [selectedValue, setSelectedValue] = useState("");

  const highlightedValue = rowValues.includes(selectedValue)
    ? selectedValue
    : (rowValues[0] ?? "");

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setQuery("");

    onOpenChange(nextOpen);
  };

  const go = (navigation: () => Promise<void>) => {
    handleOpenChange(false);
    void navigation();
  };

  const renderBody = () => {
    if (!showsHits) {
      return (
        <CommandGroup heading={t("quickSearch.sections")}>
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <CommandItem
                key={section.link.to}
                value={`section-${section.link.to}`}
                onSelect={() => go(() => navigate(section.link))}
                className={ROW_CLASS_NAME}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/12 text-primary">
                  <Icon aria-hidden="true" className="text-primary" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{t(section.labelKey)}</span>
                  {section.descriptionKey ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {t(section.descriptionKey)}
                    </span>
                  ) : null}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      );
    }

    if (hasError) {
      return (
        <p
          role="alert"
          className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground"
        >
          <CircleAlert aria-hidden="true" className="size-5 text-destructive" />
          {t("quickSearch.error")}
        </p>
      );
    }

    if (isPending) {
      return (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          {t("quickSearch.loading")}
        </p>
      );
    }

    if (itemHits.length === 0 && npcHits.length === 0 && !isFetching) {
      return (
        <p className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
          <SearchX aria-hidden="true" className="size-5" />
          {t("quickSearch.noResults", { query: debouncedQuery })}
        </p>
      );
    }

    return (
      <>
        {itemHits.length > 0 ? (
          <CommandGroup heading={t("quickSearch.items")}>
            {itemHits.map((item) => {
              const rarity = resolveItemRarity(item.rarity);

              const typeLabel = item.type
                ? ITEM_TILE_LABELS.type[item.type]
                : undefined;

              return (
                <CommandItem
                  key={item.id}
                  value={`item-${item.id}`}
                  onSelect={() =>
                    go(() =>
                      navigate({
                        to: "/items/$itemSlug",
                        params: itemPageParams(item),
                      }),
                    )
                  }
                  className={ROW_CLASS_NAME}
                >
                  <ItemImage
                    icon={item.icon}
                    rarity={rarity}
                    className="shrink-0"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "truncate font-medium",
                        ITEM_RARITY_STYLES[rarity].label,
                      )}
                    >
                      <HighlightedText
                        text={item.name}
                        query={debouncedQuery}
                      />
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[
                        typeLabel,
                        item.lvl > 0
                          ? t("common.levelShort", { level: item.lvl })
                          : undefined,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </CommandItem>
              );
            })}
            <CommandItem
              value="items-all"
              onSelect={() =>
                go(() =>
                  navigate({
                    to: "/items",
                    search: { ...EMPTY_ITEMS_SEARCH, query: debouncedQuery },
                  }),
                )
              }
              className="gap-3 rounded-lg px-2.5 py-2 text-muted-foreground"
            >
              <Search aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                {t("quickSearch.allItems", { query: debouncedQuery })}
              </span>
              <ArrowRight aria-hidden="true" />
            </CommandItem>
          </CommandGroup>
        ) : null}

        {npcHits.length > 0 ? (
          <CommandGroup heading={t("quickSearch.npcs")}>
            {npcHits.map((npc) => (
              <CommandItem
                key={npc.key}
                value={`npc-${npc.key}`}
                onSelect={() =>
                  go(() =>
                    navigate({
                      to: "/npcs/$npcSlug",
                      params: npcPageParams(npc),
                    }),
                  )
                }
                className={ROW_CLASS_NAME}
              >
                <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-muted/40">
                  <img
                    src={npcIconUrl(npc.icon)}
                    alt=""
                    loading="lazy"
                    className="max-h-9 max-w-8 object-contain"
                  />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">
                    <HighlightedText text={npc.name} query={debouncedQuery} />
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t(`npcTypes.${npc.type}`)} ·{" "}
                    {t("common.levelShort", { level: npc.lvl })}
                  </span>
                </span>
              </CommandItem>
            ))}
            <CommandItem
              value="npcs-all"
              onSelect={() =>
                go(() =>
                  navigate({
                    to: "/npcs",
                    search: { query: debouncedQuery, types: "" },
                  }),
                )
              }
              className="gap-3 rounded-lg px-2.5 py-2 text-muted-foreground"
            >
              <Search aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                {t("quickSearch.allNpcs", { query: debouncedQuery })}
              </span>
              <ArrowRight aria-hidden="true" />
            </CommandItem>
          </CommandGroup>
        ) : null}
      </>
    );
  };

  return (
    <CommandDialog
      shouldFilter={false}
      open={open}
      onOpenChange={handleOpenChange}
      value={highlightedValue}
      onValueChange={setSelectedValue}
      title={t("quickSearch.title")}
      description={t("quickSearch.description")}
      // Esc closes it on a keyboard; phones get the close button instead.
      showCloseButton={isMobile}
      className="top-[12vh] w-[calc(100%-1rem)] max-w-[600px] translate-y-0 rounded-xl border-border bg-card shadow-[0_24px_64px_rgba(0,0,0,0.55)] max-md:top-2 sm:max-w-[600px] [&_[data-slot=command]]:rounded-xl [&_[data-slot=command]]:bg-card"
    >
      <div className="relative">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={t("quickSearch.placeholder")}
          className="pr-12 text-base"
        />
        {showsHits && isFetching && !isPending ? (
          <Spinner className="absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground max-md:right-12" />
        ) : null}
      </div>
      <CommandList className="max-h-[min(60dvh,30rem)] min-h-48 p-1.5">
        {renderBody()}
      </CommandList>
      <div className="flex h-10 items-center gap-4 border-t border-border px-3.5 text-xs text-muted-foreground max-md:hidden">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          {t("quickSearch.navigate")}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd>
          {t("quickSearch.open")}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd>
          {t("quickSearch.close")}
        </span>
      </div>
    </CommandDialog>
  );
}
