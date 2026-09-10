import { ItemRarity } from "@/lib/loots/loot-types";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lootlog/ui/components/accordion";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Input } from "@lootlog/ui/components/input";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { Label } from "@lootlog/ui/components/label";
import { X } from "lucide-react";
import { FilterCombobox } from "./filter-combobox";
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
  | "itemsOptions"
  | "setDebouncedItemsSearchValue"
  | "debouncedItemsSearchValue"
  | "itemsQuery"
  | "hidItem"
  | "filterInputValues"
>;

export const LootItemFilters = ({
  t,
  itemActiveFilterCount,
  rarityOptions,
  selectedRarities,
  filters,
  updateFilters,
  professionOptions,
  selectedProfessions,
  itemsOptions,
  setDebouncedItemsSearchValue,
  debouncedItemsSearchValue,
  itemsQuery,
  hidItem,
  filterInputValues,
}: Props) => (
  <>
    <AccordionItem
      value="item"
      className="border-b border-border/70 px-3 sm:px-4"
    >
      <AccordionTrigger className="min-h-11 py-0">
        {t("loots.filtersPanel.itemSection.title")}
        {itemActiveFilterCount > 0 && (
          <span className="ml-2 inline-flex size-5 items-center justify-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary">
            {itemActiveFilterCount}
          </span>
        )}
      </AccordionTrigger>
      <AccordionContent className="space-y-4 border-t border-border/70 pb-3 pt-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
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
                    const currentRarities = filters.rarities ?? [];
                    const newRarities = checked
                      ? [...currentRarities, rarity.value]
                      : currentRarities.filter((r) => r !== rarity.value);
                    updateFilters({ rarities: newRarities });
                  }}
                />
                <Label
                  htmlFor={`rarity-${rarity.value}`}
                  className="text-sm cursor-pointer"
                >
                  {rarity.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
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
                    const currentProfessions = filters.professions ?? [];
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
                  className="text-sm cursor-pointer"
                >
                  {profession.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            {t("loots.filtersPanel.itemSection.itemsLabel")}
          </Label>
          <FilterCombobox
            name="itemNames"
            placeholder={t("loots.filtersPanel.itemSection.itemsPlaceholder")}
            options={itemsOptions}
            defaultValue={filters.itemNames}
            onSelect={(_, values) => updateFilters({ itemNames: values })}
            controlledSearch
            onSearchChange={setDebouncedItemsSearchValue}
            searchValue={debouncedItemsSearchValue}
            loading={itemsQuery.isLoading}
            searchError={itemsQuery.isError}
            minimumSearchLength={2}
          />
        </div>

        {hidItem && filters.hid && (
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              {t("loots.filtersPanel.itemSection.filteredItemLabel")}
            </Label>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <ItemImage
                icon={hidItem.icon}
                rarity={hidItem.rarity ?? ItemRarity.COMMON}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{hidItem.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("loots.filtersPanel.common.levelValue", {
                    level: hidItem.lvl,
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => updateFilters({ hid: "" })}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              {t("loots.filtersPanel.common.minLevel")}
            </Label>
            <Input
              type="number"
              placeholder="0"
              value={filterInputValues.itemLevelMin}
              onChange={(e) => updateFilters({ itemLevelMin: e.target.value })}
              min={0}
              max={500}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              {t("loots.filtersPanel.common.maxLevel")}
            </Label>
            <Input
              type="number"
              placeholder="500"
              value={filterInputValues.itemLevelMax}
              onChange={(e) => updateFilters({ itemLevelMax: e.target.value })}
              min={0}
              max={500}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  </>
);
