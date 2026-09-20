import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lootlog/ui/components/accordion";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
import { NpcSearchTile } from "@/components/tiles";
import {
  SearchCombobox,
  type SearchComboboxOption,
} from "@/components/filters/search-combobox";
import { LootFilterSectionBadge } from "./loot-filter-section-badge";
import { LootLevelRangeFilter } from "./loot-level-range-filter";
import type { useLootFiltersSidebar } from "./use-loot-filters-sidebar";

type Props = Pick<
  ReturnType<typeof useLootFiltersSidebar>,
  | "t"
  | "npcActiveFilterCount"
  | "npcTypeOptions"
  | "selectedNpcTypes"
  | "filters"
  | "updateFilters"
  | "npcHits"
  | "npcsSearchValue"
  | "setNpcsSearchValue"
  | "isNpcsSearching"
  | "npcsSearchError"
  | "levelRanges"
>;

export const LootNpcFilters = ({
  t,
  npcActiveFilterCount,
  npcTypeOptions,
  selectedNpcTypes,
  filters,
  updateFilters,
  npcHits,
  npcsSearchValue,
  setNpcsSearchValue,
  isNpcsSearching,
  npcsSearchError,
  levelRanges,
}: Props) => {
  const npcOptions: SearchComboboxOption[] = npcHits.map((npc) => ({
    value: npc.name,
    label: npc.name,
    description: t(`npcType.${npc.type}`),
    meta:
      npc.lvl > 0
        ? t("loots.searchCommand.level", { level: npc.lvl })
        : undefined,
    icon: <NpcSearchTile icon={npc.icon} name={npc.name} />,
  }));

  return (
    <AccordionItem
      value="npc"
      className="border-b border-border/70 px-3 sm:px-4"
    >
      <AccordionTrigger className="min-h-11 py-0">
        {t("loots.filtersPanel.npcSection.title")}
        <LootFilterSectionBadge count={npcActiveFilterCount} />
      </AccordionTrigger>
      <AccordionContent className="space-y-4 border-t border-border/70 pb-4 pt-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
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
                    const currentTypes = filters.npcTypes;

                    const newTypes = checked
                      ? [...currentTypes, npcType.value]
                      : currentTypes.filter((t) => t !== npcType.value);

                    updateFilters({ npcTypes: newTypes });
                  }}
                />
                <Label
                  htmlFor={`npcType-${npcType.value}`}
                  className="cursor-pointer text-sm"
                >
                  {npcType.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("loots.filtersPanel.npcSection.npcsLabel")}
          </Label>
          <SearchCombobox
            options={npcOptions}
            selected={filters.npcs}
            onSelectedChange={(values) => updateFilters({ npcs: values })}
            searchValue={npcsSearchValue}
            onSearchChange={setNpcsSearchValue}
            placeholder={t("loots.filtersPanel.npcSection.npcsPlaceholder")}
            searchPlaceholder={t(
              "loots.filtersPanel.npcSection.npcsSearchPlaceholder",
            )}
            loading={isNpcsSearching}
            errorMessage={
              npcsSearchError ? t("common.searchUnavailable") : undefined
            }
          />
        </div>

        <LootLevelRangeFilter
          min={levelRanges.npc.min}
          max={levelRanges.npc.max}
          onChange={({ min, max }) =>
            updateFilters({
              ...(min !== undefined && { npcLevelMin: min }),
              ...(max !== undefined && { npcLevelMax: max }),
            })
          }
        />
      </AccordionContent>
    </AccordionItem>
  );
};
