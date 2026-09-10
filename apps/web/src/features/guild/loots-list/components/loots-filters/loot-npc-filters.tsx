import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lootlog/ui/components/accordion";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { FilterCombobox } from "./filter-combobox";
import type { useLootFiltersSidebar } from "./use-loot-filters-sidebar";

type Props = Pick<
  ReturnType<typeof useLootFiltersSidebar>,
  | "t"
  | "npcActiveFilterCount"
  | "npcTypeOptions"
  | "selectedNpcTypes"
  | "filters"
  | "updateFilters"
  | "npcsOptions"
  | "setDebouncedNpcsSearchValue"
  | "debouncedNpcsSearchValue"
  | "npcsQuery"
  | "filterInputValues"
>;

export const LootNpcFilters = ({
  t,
  npcActiveFilterCount,
  npcTypeOptions,
  selectedNpcTypes,
  filters,
  updateFilters,
  npcsOptions,
  setDebouncedNpcsSearchValue,
  debouncedNpcsSearchValue,
  npcsQuery,
  filterInputValues,
}: Props) => (
  <>
    <AccordionItem
      value="npc"
      className="border-b border-border/70 px-3 sm:px-4"
    >
      <AccordionTrigger className="min-h-11 py-0">
        {t("loots.filtersPanel.npcSection.title")}
        {npcActiveFilterCount > 0 && (
          <span className="ml-2 inline-flex size-5 items-center justify-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary">
            {npcActiveFilterCount}
          </span>
        )}
      </AccordionTrigger>
      <AccordionContent className="space-y-4 border-t border-border/70 pb-3 pt-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            {t("loots.filtersPanel.npcSection.npcTypesLabel")}
          </Label>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {npcTypeOptions.map((npcType) => (
              <div
                key={npcType.value}
                className="flex min-h-8 items-center gap-2"
              >
                <Checkbox
                  id={`npcType-${npcType.value}`}
                  checked={selectedNpcTypes.has(npcType.value)}
                  onCheckedChange={(checked) => {
                    const currentTypes = filters.npcTypes ?? [];
                    const newTypes = checked
                      ? [...currentTypes, npcType.value]
                      : currentTypes.filter((t) => t !== npcType.value);
                    updateFilters({ npcTypes: newTypes });
                  }}
                />
                <Label
                  htmlFor={`npcType-${npcType.value}`}
                  className="text-sm cursor-pointer"
                >
                  {npcType.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            {t("loots.filtersPanel.npcSection.npcsLabel")}
          </Label>
          <FilterCombobox
            name="npcs"
            placeholder={t("loots.filtersPanel.npcSection.npcsPlaceholder")}
            options={npcsOptions}
            defaultValue={filters.npcs}
            onSelect={(_, values) => updateFilters({ npcs: values })}
            controlledSearch
            onSearchChange={setDebouncedNpcsSearchValue}
            searchValue={debouncedNpcsSearchValue}
            loading={npcsQuery.isLoading}
            searchError={npcsQuery.isError}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              {t("loots.filtersPanel.common.minLevel")}
            </Label>
            <Input
              type="number"
              placeholder="0"
              value={filterInputValues.npcLevelMin}
              onChange={(e) => updateFilters({ npcLevelMin: e.target.value })}
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
              value={filterInputValues.npcLevelMax}
              onChange={(e) => updateFilters({ npcLevelMax: e.target.value })}
              min={0}
              max={500}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  </>
);
