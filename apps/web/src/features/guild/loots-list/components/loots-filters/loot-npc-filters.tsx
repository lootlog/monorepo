import { formatLevel } from "@lootlog/domain/profession";
import { Label } from "@lootlog/ui/components/label";
import { NpcSearchTile } from "@/components/tiles";
import {
  SearchCombobox,
  type SearchComboboxOption,
} from "@/components/filters/search-combobox";
import { FilterPills } from "@lootlog/ui/components/filter-pills";
import { LootLevelRangeFilter } from "./loot-level-range-filter";
import type { useLootFiltersSidebar } from "./use-loot-filters-sidebar";

type Props = Pick<
  ReturnType<typeof useLootFiltersSidebar>,
  | "t"
  | "npcTypeOptions"
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
  npcTypeOptions,
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
        ? t("loots.searchCommand.level", {
            level: formatLevel(npc.lvl, npc.prof),
          })
        : undefined,
    icon: <NpcSearchTile icon={npc.icon} name={npc.name} />,
  }));

  return (
    <>
      <FilterPills
        label={t("loots.filtersPanel.npcSection.npcTypesLabel")}
        options={npcTypeOptions}
        value={filters.npcTypes}
        onValueChange={(npcTypes) => updateFilters({ npcTypes })}
      />

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
    </>
  );
};
