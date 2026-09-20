import { ItemRarity } from "@/lib/loots/loot-types";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lootlog/ui/components/accordion";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { Label } from "@lootlog/ui/components/label";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import { X } from "lucide-react";
import {
  SearchCombobox,
  type SearchComboboxOption,
} from "@/components/filters/search-combobox";
import { getRarityStyle } from "./loot-search-presentation";
import { LootFilterSectionBadge } from "./loot-filter-section-badge";
import { LootLevelRangeFilter } from "./loot-level-range-filter";
import type { useLootFiltersSidebar } from "./use-loot-filters-sidebar";

type Props = Pick<
  ReturnType<typeof useLootFiltersSidebar>,
  | "t"
  | "itemActiveFilterCount"
  | "rarityOptions"
  | "selectedRarities"
  | "filters"
  | "updateFilters"
  | "professionOptions"
  | "selectedProfessions"
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
  itemActiveFilterCount,
  rarityOptions,
  selectedRarities,
  filters,
  updateFilters,
  professionOptions,
  selectedProfessions,
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
      <span className={cn("font-semibold", getRarityStyle(item.rarity))}>
        {t(`itemRarity.${item.rarity}`, { defaultValue: item.rarity })}
      </span>
    ) : undefined,
    meta:
      item.lvl > 0
        ? t("loots.searchCommand.level", { level: item.lvl })
        : undefined,
    icon: (
      <ItemImage
        icon={item.icon}
        rarity={resolveItemRarity(item.rarity)}
        className="[&>div]:cursor-default"
      />
    ),
  }));

  return (
    <AccordionItem
      value="item"
      className="border-b border-border/70 px-3 sm:px-4"
    >
      <AccordionTrigger className="min-h-11 py-0">
        {t("loots.filtersPanel.itemSection.title")}
        <LootFilterSectionBadge count={itemActiveFilterCount} />
      </AccordionTrigger>
      <AccordionContent className="space-y-4 border-t border-border/70 pb-4 pt-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("loots.filtersPanel.itemSection.raritiesLabel")}
          </Label>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {rarityOptions.map((rarity) => (
              <div
                key={rarity.value}
                className="flex min-h-8 items-center gap-2"
              >
                <Checkbox
                  id={`rarity-${rarity.value}`}
                  checked={selectedRarities.has(rarity.value)}
                  onCheckedChange={(checked) => {
                    const currentRarities = filters.rarities;

                    const newRarities = checked
                      ? [...currentRarities, rarity.value]
                      : currentRarities.filter((r) => r !== rarity.value);

                    updateFilters({ rarities: newRarities });
                  }}
                />
                <Label
                  htmlFor={`rarity-${rarity.value}`}
                  className="cursor-pointer text-sm"
                >
                  {rarity.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("loots.filtersPanel.itemSection.professionsLabel")}
          </Label>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {professionOptions.map((profession) => (
              <div
                key={profession.value}
                className="flex min-h-8 items-center gap-2"
              >
                <Checkbox
                  id={`itemProfession-${profession.value}`}
                  checked={selectedProfessions.has(profession.value)}
                  onCheckedChange={(checked) => {
                    const currentProfessions = filters.professions;

                    const newProfessions = checked
                      ? [...currentProfessions, profession.value]
                      : currentProfessions.filter(
                          (prof) => prof !== profession.value,
                        );

                    updateFilters({
                      professions: newProfessions,
                    });
                  }}
                />
                <Label
                  htmlFor={`itemProfession-${profession.value}`}
                  className="cursor-pointer text-sm"
                >
                  {profession.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

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

        {hidItem && filters.hid && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {t("loots.filtersPanel.itemSection.filteredItemLabel")}
            </Label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2">
              <ItemImage
                icon={hidItem.icon}
                rarity={hidItem.rarity ?? ItemRarity.COMMON}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{hidItem.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("loots.filtersPanel.common.levelValue", {
                    level: hidItem.lvl,
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                aria-label={t("common.removeOption", { label: hidItem.name })}
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
      </AccordionContent>
    </AccordionItem>
  );
};
