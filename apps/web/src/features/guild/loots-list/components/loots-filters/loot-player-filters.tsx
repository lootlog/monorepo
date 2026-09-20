import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lootlog/ui/components/accordion";
import { Label } from "@lootlog/ui/components/label";
import { PlayerSearchTile } from "@/components/tiles";
import {
  SearchCombobox,
  type SearchComboboxOption,
} from "@/components/filters/search-combobox";
import { getShortnameByProf } from "@lootlog/domain/profession";
import { LootFilterSectionBadge } from "./loot-filter-section-badge";
import { LootLevelRangeFilter } from "./loot-level-range-filter";
import type { useLootFiltersSidebar } from "./use-loot-filters-sidebar";

type Props = Pick<
  ReturnType<typeof useLootFiltersSidebar>,
  | "t"
  | "playerActiveFilterCount"
  | "filters"
  | "updateFilters"
  | "playerHits"
  | "playersSearchValue"
  | "setPlayersSearchValue"
  | "isPlayersSearching"
  | "playersSearchError"
  | "levelRanges"
>;

export const LootPlayerFilters = ({
  t,
  playerActiveFilterCount,
  filters,
  updateFilters,
  playerHits,
  playersSearchValue,
  setPlayersSearchValue,
  isPlayersSearching,
  playersSearchError,
  levelRanges,
}: Props) => {
  const playerOptions: SearchComboboxOption[] = playerHits.map((player) => {
    const professionShortname = getShortnameByProf(player.prof);

    return {
      value: player.name,
      label: player.name,
      description: professionShortname
        ? t(`professions.${professionShortname}`)
        : undefined,
      meta:
        player.lvl > 0
          ? t("loots.searchCommand.level", { level: player.lvl })
          : undefined,
      icon: (
        <PlayerSearchTile
          icon={player.icon}
          name={player.name}
          className="mr-0 h-9 w-6 cursor-default bg-[length:24px_36px]"
        />
      ),
    };
  });

  return (
    <AccordionItem value="player" className="px-3 sm:px-4">
      <AccordionTrigger className="min-h-11 py-0">
        {t("loots.filtersPanel.playerSection.title")}
        <LootFilterSectionBadge count={playerActiveFilterCount} />
      </AccordionTrigger>
      <AccordionContent className="space-y-4 border-t border-border/70 pb-4 pt-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("loots.filtersPanel.playerSection.playersLabel")}
          </Label>
          <SearchCombobox
            options={playerOptions}
            selected={filters.players}
            onSelectedChange={(values) => updateFilters({ players: values })}
            searchValue={playersSearchValue}
            onSearchChange={setPlayersSearchValue}
            placeholder={t(
              "loots.filtersPanel.playerSection.playersPlaceholder",
            )}
            searchPlaceholder={t(
              "loots.filtersPanel.playerSection.playersSearchPlaceholder",
            )}
            loading={isPlayersSearching}
            errorMessage={
              playersSearchError ? t("common.searchUnavailable") : undefined
            }
          />
        </div>

        <LootLevelRangeFilter
          min={levelRanges.player.min}
          max={levelRanges.player.max}
          onChange={({ min, max }) =>
            updateFilters({
              ...(min !== undefined && { playerLevelMin: min }),
              ...(max !== undefined && { playerLevelMax: max }),
            })
          }
        />
      </AccordionContent>
    </AccordionItem>
  );
};
