import { ColorSwatchToggle } from "@/components/ui/color-swatch-toggle";
import { LevelRangeFilter } from "@/components/level-range-filter";
import { SearchInput } from "@/components/ui/search-input";
import {
  toolbarStripBleedClassName,
  toolbarStripLightClassName,
  toolbarStripLightSubRowClassName,
  toolbarStripRowClassName,
} from "@/components/ui/toolbar-strip";
import { TimersListFilter } from "./timers-list-filter";
import { TimersNpcTypeFilter } from "./timers-npc-type-filter";
import { cn } from "cn";
import { useTimerFilters } from "@/features/timers/hooks/use-timer-filters";
import { useTimersStore } from "@/store/timers.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { getTimerColorOptions } from "@/features/timers/utils/get-timer-color-options";

const MAX_LVL = 500;

const MIN_LVL = 0;

type TimersFiltersProps = {
  filtersKey: string;
  world: string;
};

export const TimersFilters: FC<TimersFiltersProps> = ({
  filtersKey,
  world,
}) => {
  const { t } = useTranslation("timers");
  const { t: tCommon } = useTranslation("common");

  const {
    timerFiltersSearchText,
    setTimerFiltersSearchText,
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
    hiddenDefaultColors,
    colorFiltersEnabled,
    customLists,
    displayConfig: { legacyAppearance },
  } = useTimersStore();

  const { filters, setFilters } = useTimerFilters(filtersKey, world);
  const selectedColors = new Set(filters.selectedColors);

  const colors = getTimerColorOptions({
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
    hiddenDefaultColors,
    legacyAppearance,
  });

  const lists = Object.values(customLists);

  const handleToggleColor = (colorId: string) => {
    setFilters({
      ...filters,
      selectedColors: selectedColors.has(colorId)
        ? filters.selectedColors.filter((id) => id !== colorId)
        : [...filters.selectedColors, colorId],
    });
  };

  return (
    <div
      className={cn(
        toolbarStripBleedClassName,
        toolbarStripLightClassName,
        "ll:mt-0 ll:flex ll:flex-col",
      )}
    >
      <div className={toolbarStripRowClassName}>
        <SearchInput
          size="sm"
          variant="borderless"
          placeholder={t("filters.searchPlaceholder")}
          value={timerFiltersSearchText ?? ""}
          onChange={(event) => setTimerFiltersSearchText(event.target.value)}
          onClear={() => setTimerFiltersSearchText("")}
          clearLabel={tCommon("actions.clearSearch")}
          className="ll:min-w-0"
        />
        <LevelRangeFilter
          value={filters}
          min={MIN_LVL}
          max={MAX_LVL}
          onChange={(range) => setFilters({ ...filters, ...range })}
        />
        <TimersNpcTypeFilter
          selectedNpcTypes={filters.selectedNpcTypes}
          onChange={(selectedNpcTypes) =>
            setFilters({ ...filters, selectedNpcTypes })
          }
        />
      </div>
      {lists.length > 0 && (
        <TimersListFilter
          lists={lists}
          selectedLists={filters.selectedLists}
          onChange={(selectedLists) =>
            setFilters({ ...filters, selectedLists })
          }
        />
      )}
      {colorFiltersEnabled && (
        <div className={toolbarStripLightSubRowClassName}>
          {colors.map((color) => (
            <ColorSwatchToggle
              key={color.id}
              color={color.swatchColor}
              label={color.name}
              selected={selectedColors.has(color.id)}
              onClick={() => handleToggleColor(color.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
