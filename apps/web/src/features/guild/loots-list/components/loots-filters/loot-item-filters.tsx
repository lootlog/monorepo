import { ItemRarity } from "@/lib/loots/loot-types";
import { Button } from "@lootlog/ui/components/button";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { Label } from "@lootlog/ui/components/label";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import { X } from "lucide-react";
import {
  SearchCombobox,
  type SearchComboboxOption,
} from "@/components/filters/search-combobox";
import {
  LOOT_RARITY_PILL_CLASS,
  LOOT_RARITY_TEXT_CLASS,
} from "@/features/guild/loots-list/loot-rarity-colors";
import { LootFilterPills } from "./loot-filter-pills";
import { LootLevelRangeFilter } from "./loot-level-range-filter";
import type { useLootFiltersSidebar } from "./use-loot-filters-sidebar";

type Props = Pick<
  ReturnType<typeof useLootFiltersSidebar>,
  | "t"
  | "rarityOptions"
  | "filters"
  | "updateFilters"
  | "professionOptions"
  | "itemHits"
  | "itemsSearchValue"
  | "setItemsSearchValue"
  | "isItemsSearching"
  | "itemsSearchError"
  | "hidItem"
  | "levelRanges"
>;

const ITEM_SEARCH_MINIMUM_LENGTH = 2;

export const LootItemFilters = ({
  t,
  rarityOptions,
  filters,
  updateFilters,
  professionOptions,
  itemHits,
  itemsSearchValue,
  setItemsSearchValue,
  isItemsSearching,
  itemsSearchError,
  hidItem,
  levelRanges,
}: Props) => {
  const itemOptions: SearchComboboxOption[] = itemHits.map((item) => ({
    value: item.name,
    label: item.name,
    description: item.rarity ? (
      <span
        className={cn(
          "font-semibold",
          LOOT_RARITY_TEXT_CLASS[resolveItemRarity(item.rarity)],
        )}
      >
        {t(`itemRarity.${item.rarity}`, { defaultValue: item.rarity })}
      </span>
    ) : undefined,
    meta:
      item.lvl > 0
        ? t("loots.searchCommand.level", { level: item.lvl })
        : undefined,
    icon: (
      <ItemImage icon={item.icon} rarity={resolveItemRarity(item.rarity)} />
    ),
  }));

  return (
    <>
      <LootFilterPills
        label={t("loots.filtersPanel.itemSection.raritiesLabel")}
        options={rarityOptions.map((rarity) => ({
          ...rarity,
          className: LOOT_RARITY_PILL_CLASS[resolveItemRarity(rarity.value)],
        }))}
        value={filters.rarities}
        onValueChange={(rarities) => updateFilters({ rarities })}
      />

      <LootFilterPills
        label={t("loots.filtersPanel.itemSection.professionsLabel")}
        options={professionOptions}
        value={filters.professions}
        onValueChange={(professions) => updateFilters({ professions })}
      />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t("loots.filtersPanel.itemSection.itemsLabel")}
        </Label>
        <SearchCombobox
          options={itemOptions}
          selected={filters.itemNames}
          onSelectedChange={(values) => updateFilters({ itemNames: values })}
          searchValue={itemsSearchValue}
          onSearchChange={setItemsSearchValue}
          placeholder={t("loots.filtersPanel.itemSection.itemsPlaceholder")}
          searchPlaceholder={t(
            "loots.filtersPanel.itemSection.itemsSearchPlaceholder",
          )}
          loading={isItemsSearching}
          errorMessage={
            itemsSearchError ? t("common.searchUnavailable") : undefined
          }
          minimumSearchLength={ITEM_SEARCH_MINIMUM_LENGTH}
        />
      </div>

      {/* Without a world the HID cannot be resolved to an item, but the
            filter still applies, so it stays visible by its number. */}
      {filters.hid && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("loots.filtersPanel.itemSection.filteredItemLabel")}
          </Label>
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background p-2">
            {hidItem && (
              <ItemImage
                icon={hidItem.icon}
                rarity={hidItem.rarity ?? ItemRarity.COMMON}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {hidItem?.name ?? `#${filters.hid}`}
              </p>
              {hidItem && (
                <p className="text-xs text-muted-foreground">
                  {t("loots.filtersPanel.common.levelValue", {
                    level: hidItem.lvl,
                  })}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label={t("common.removeOption", {
                label: hidItem?.name ?? `#${filters.hid}`,
              })}
              onClick={() => updateFilters({ hid: "" })}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      <LootLevelRangeFilter
        min={levelRanges.item.min}
        max={levelRanges.item.max}
        onChange={({ min, max }) =>
          updateFilters({
            ...(min !== undefined && { itemLevelMin: min }),
            ...(max !== undefined && { itemLevelMax: max }),
          })
        }
      />
    </>
  );
};
