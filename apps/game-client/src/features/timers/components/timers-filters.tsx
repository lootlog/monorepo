import { ColorSwatchToggle } from "@/components/ui/color-swatch-toggle";
import { LevelRangeFilter } from "@/components/level-range-filter";
import { SearchInput } from "@/components/ui/search-input";
import {
  toolbarStripBleedClassName,
  toolbarStripLightClassName,
  toolbarStripRowClassName,
} from "@/components/ui/toolbar-strip";
import { TimersNpcTypeFilter } from "./timers-npc-type-filter";
import { cn } from "cn";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { getTimerColorOptions } from "@/features/timers/utils/get-timer-color-options";

const MAX_LVL = 500;

const MIN_LVL = 0;

type TimersFiltersProps = {
  filtersKey: string;
};

export const TimersFilters: FC<TimersFiltersProps> = ({ filtersKey }) => {
  const { t } = useTranslation("timers");
  const { t: tCommon } = useTranslation("common");

  const {
    timerFiltersSearchText,
    setTimerFiltersSearchText,
    timersFilters,
    setTimersFilters,
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
    hiddenDefaultColors,
    colorFiltersEnabled,
    displayConfig: { legacyAppearance },
  } = useTimersStore();

  const filters = timersFilters[filtersKey] ?? DEFAULT_TIMERS_FILTERS;
  const selectedColors = new Set(filters.selectedColors);

  const colors = getTimerColorOptions({
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
    hiddenDefaultColors,
    legacyAppearance,
  });

  const handleToggleColor = (colorId: string) => {
    setTimersFilters(filtersKey, {
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
          onChange={(range) =>
            setTimersFilters(filtersKey, { ...filters, ...range })
          }
        />
        <TimersNpcTypeFilter
          selectedNpcTypes={filters.selectedNpcTypes}
          onChange={(selectedNpcTypes) =>
            setTimersFilters(filtersKey, { ...filters, selectedNpcTypes })
          }
        />
      </div>
      {colorFiltersEnabled && (
        <div className="ll:flex ll:flex-row ll:flex-wrap ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/25 ll:p-0.5">
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
