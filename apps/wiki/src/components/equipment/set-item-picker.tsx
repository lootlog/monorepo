import { keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CircleAlert, Search, SearchX } from "lucide-react";
import { useState } from "react";
import { useCatalogControllerGetItems } from "@lootlog/client/catalog";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import type { EquipmentSet } from "@/lib/equipment-set";
import {
  type EquipmentSlotId,
  secondaryTypesBeside,
} from "@/lib/equipment-slots";
import { RARITY_OPTIONS } from "@/lib/item-options";
import { type ItemsSearch, toCatalogParams } from "@/lib/items-search";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";
import { SetItemPickerRow } from "./set-item-picker-row";

const HITS = 40;

const ALL_FILTERS = "all-filters";

/** Who the picker searches for, such as `Wojownik · do 300 lvl`. */
const describeCharacter = ({
  profession,
  level,
}: Pick<EquipmentSet, "profession" | "level">) => {
  const parts = [
    profession ? t(`filters.professions.${profession}`) : undefined,
    level === null ? undefined : t("setPicker.upToLevel", { level }),
  ].filter((part) => part !== undefined);

  return parts.length > 0 ? parts.join(" · ") : t("setPicker.anyCharacter");
};

type SetItemPickerProps = {
  slotId: EquipmentSlotId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Finds an item for one slot of the set without leaving the page: only what
 * the set's character can wear there, strongest first, narrowed by name and
 * rarity. Choosing an item wears it.
 */
export function SetItemPicker({
  slotId,
  open,
  onOpenChange,
}: SetItemPickerProps) {
  const navigate = useNavigate();
  const { set, equip } = useEquipmentSet();
  const wornItems = useWornItems();
  const [query, setQuery] = useState("");
  const [rarities, setRarities] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query.trim(), 150);

  const slotLabel = t(`slots.${slotId}`);
  const worn = wornItems.get(slotId);

  // The other hand takes only what the worn weapon leaves room for.
  const fittingTypes =
    slotId === "secondary"
      ? secondaryTypesBeside(wornItems.get("weapon")?.item.type)
      : undefined;

  const search: ItemsSearch = {
    ...EMPTY_ITEMS_SEARCH,
    query: debouncedQuery,
    slot: fittingTypes ? "" : slotId,
    types: fittingTypes?.join(",") ?? "",
    professions: set.profession ?? "",
    maxLevel: set.level ?? undefined,
    rarities: rarities.join(","),
  };

  const { data, isPending, isError, isFetching, isPlaceholderData } =
    useCatalogControllerGetItems(
      { ...toCatalogParams(search), limit: HITS },
      { query: { enabled: open, placeholderData: keepPreviousData } },
    );

  const hits = data?.hits ?? [];
  const isStale = debouncedQuery !== query.trim() || isPlaceholderData;

  const rowValues = [...hits.map((item) => `item-${item.id}`), ALL_FILTERS];
  const [selectedValue, setSelectedValue] = useState("");

  const highlightedValue = rowValues.includes(selectedValue)
    ? selectedValue
    : (rowValues[0] ?? "");

  const character = describeCharacter(set);

  return (
    <CommandDialog
      shouldFilter={false}
      open={open}
      onOpenChange={onOpenChange}
      value={highlightedValue}
      onValueChange={setSelectedValue}
      title={t("setPicker.title", { slot: slotLabel })}
      description={t("setPicker.description")}
      className="top-[12vh] w-[calc(100%-1rem)] max-w-[600px] translate-y-0 rounded-xl border-border bg-card shadow-[0_24px_64px_rgba(0,0,0,0.55)] max-md:top-2 sm:max-w-[600px] [&_[data-slot=command]]:rounded-xl [&_[data-slot=command]]:bg-card"
    >
      <div className="relative">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={t("setPicker.placeholder", { slot: slotLabel })}
          className="pr-12 text-base"
        />
        {isFetching && !isPending ? (
          <Spinner className="absolute top-1/2 right-12 size-4 -translate-y-1/2 text-muted-foreground" />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3.5 py-2">
        <ToggleGroup
          aria-label={t("filters.rarity")}
          multiple
          variant="outline"
          size="sm"
          spacing={1.5}
          className="flex-wrap"
          value={rarities}
          onValueChange={setRarities}
        >
          {RARITY_OPTIONS.map((rarity) => (
            <ToggleGroupItem key={rarity} value={rarity}>
              {t(`itemRarity.${rarity}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="ml-auto text-xs text-muted-foreground">{character}</p>
      </div>
      <CommandList className="max-h-[min(60dvh,30rem)] min-h-48 p-1.5">
        {isError ? (
          <p
            role="alert"
            className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground"
          >
            <CircleAlert
              aria-hidden="true"
              className="size-5 text-destructive"
            />
            {t("quickSearch.error")}
          </p>
        ) : isPending ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            {t("quickSearch.loading")}
          </p>
        ) : (
          <CommandGroup>
            {hits.length === 0 ? (
              <p className="flex flex-col items-center gap-3 px-6 py-8 text-center text-sm text-muted-foreground">
                <SearchX aria-hidden="true" className="size-5" />
                {t("setPicker.noResults")}
              </p>
            ) : null}
            {hits.map((item) => (
              <SetItemPickerRow
                key={item.id}
                item={item}
                value={`item-${item.id}`}
                query={debouncedQuery}
                isWorn={worn?.item.id === item.id}
                // Hits kept from an earlier search cannot be chosen, so
                // Enter never wears an item the field no longer asks for.
                disabled={isStale}
                onSelect={() => {
                  equip(item);
                  onOpenChange(false);
                }}
              />
            ))}
            <CommandItem
              value={ALL_FILTERS}
              onSelect={() => {
                onOpenChange(false);
                void navigate({ to: "/items", search });
              }}
              className="gap-3 rounded-lg px-2.5 py-2 text-muted-foreground"
            >
              <Search aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                {t("setPicker.allFilters")}
              </span>
              <ArrowRight aria-hidden="true" />
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
