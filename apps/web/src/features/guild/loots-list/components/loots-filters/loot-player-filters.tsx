import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lootlog/ui/components/accordion";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { FilterCombobox } from "./filter-combobox";
import type { useLootFiltersSidebar } from "./use-loot-filters-sidebar";
type Props = Pick<
  ReturnType<typeof useLootFiltersSidebar>,
  | "t"
  | "playerActiveFilterCount"
  | "playersOptions"
  | "filters"
  | "updateFilters"
  | "setDebouncedPlayersSearchValue"
  | "debouncedPlayersSearchValue"
  | "playersQuery"
  | "filterInputValues"
>;
export const LootPlayerFilters = ({
  t,
  playerActiveFilterCount,
  playersOptions,
  filters,
  updateFilters,
  setDebouncedPlayersSearchValue,
  debouncedPlayersSearchValue,
  playersQuery,
  filterInputValues,
}: Props) => (
  <>
    <AccordionItem value="player" className="px-3 sm:px-4">
      <AccordionTrigger className="min-h-11 py-0">
        {t("loots.filtersPanel.playerSection.title")}
        {playerActiveFilterCount > 0 && (
          <span className="ml-2 inline-flex size-5 items-center justify-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary">
            {playerActiveFilterCount}
          </span>
        )}
      </AccordionTrigger>
      <AccordionContent className="space-y-4 border-t border-border/70 pb-3 pt-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            {t("loots.filtersPanel.playerSection.playersLabel")}
          </Label>
          <FilterCombobox
            name="players"
            placeholder={t(
              "loots.filtersPanel.playerSection.playersPlaceholder",
            )}
            options={playersOptions}
            defaultValue={filters.players}
            onSelect={(_, values) => updateFilters({ players: values })}
            controlledSearch
            onSearchChange={setDebouncedPlayersSearchValue}
            searchValue={debouncedPlayersSearchValue}
            loading={playersQuery.isLoading}
            searchError={playersQuery.isError}
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
              value={filterInputValues.playerLevelMin}
              onChange={(e) =>
                updateFilters({ playerLevelMin: e.target.value })
              }
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
              value={filterInputValues.playerLevelMax}
              onChange={(e) =>
                updateFilters({ playerLevelMax: e.target.value })
              }
              min={0}
              max={500}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  </>
);
