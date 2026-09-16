import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import {
  toolbarStripBleedClassName,
  toolbarStripLightClassName,
  toolbarStripLightDividerClassName,
  toolbarStripRowClassName,
} from "@/components/ui/toolbar-strip";
import { TimersNpcTypeFilter } from "./timers-npc-type-filter";
import { cn } from "cn";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";
import type { FC } from "react";
import {
  TIMERS_COLORS,
  getTimerColor,
} from "@/features/timers/constants/timer-colors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { getDefaultColorName } from "@/features/timers/utils/get-default-color-name";

const MAX_LVL = 500;

const MIN_LVL = 0;

const clampValue = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

type TimersFiltersProps = {
  filtersKey: string;
};

export const TimersFilters: FC<TimersFiltersProps> = ({ filtersKey }) => {
  const { t } = useTranslation("timers");

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
  const hiddenColors = new Set(hiddenDefaultColors);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimerFiltersSearchText(e.target.value);
  };

  const handleLevelChange = (
    field: "minLvl" | "maxLvl",
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const numericValue = Number(event.target.value);

    if (Number.isNaN(numericValue)) return;
    setTimersFilters(filtersKey, {
      ...filters,
      [field]: clampValue(numericValue, MIN_LVL, MAX_LVL),
    });
  };

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
          onChange={handleSearchChange}
          onClear={() => setTimerFiltersSearchText("")}
          clearLabel={t("filters.clearSearch")}
          className="ll:min-w-0"
        />
        <Input
          aria-label={t("filters.minLvlLabel")}
          value={filters.minLvl.toString()}
          onChange={(event) => handleLevelChange("minLvl", event)}
          className={cn(
            toolbarStripLightDividerClassName,
            "ll:w-8 ll:shrink-0 input-no-spinner ll:px-0.5 ll:text-center",
          )}
          max={MAX_LVL}
          min={MIN_LVL}
          type="number"
          inputMode="numeric"
          variant="borderless"
        />
        <Input
          aria-label={t("filters.maxLvlLabel")}
          value={filters.maxLvl.toString()}
          onChange={(event) => handleLevelChange("maxLvl", event)}
          className={cn(
            toolbarStripLightDividerClassName,
            "ll:w-8 ll:shrink-0 input-no-spinner ll:px-0.5 ll:text-center",
          )}
          min={MIN_LVL}
          max={MAX_LVL}
          type="number"
          inputMode="numeric"
          variant="borderless"
        />
        <TimersNpcTypeFilter
          selectedNpcTypes={filters.selectedNpcTypes}
          onChange={(selectedNpcTypes) =>
            setTimersFilters(filtersKey, { ...filters, selectedNpcTypes })
          }
        />
      </div>
      {colorFiltersEnabled && (
        <div className="ll:flex ll:flex-row ll:flex-wrap ll:gap-1 ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/25 ll:px-1 ll:py-1">
          {Object.entries(TIMERS_COLORS).flatMap(([colorId]) => {
            if (hiddenColors.has(colorId)) return [];
            const isSelected = selectedColors.has(colorId);

            const swatchColor =
              overriddenDefaultColors[colorId]?.borderColor ??
              getTimerColor(colorId, legacyAppearance)?.accent;

            return (
              <Tooltip key={colorId}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={
                      defaultColorNames[colorId] ??
                      getDefaultColorName(colorId, legacyAppearance)
                    }
                    aria-pressed={isSelected}
                    onClick={() => handleToggleColor(colorId)}
                    className={cn(
                      "ll:p-0 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:size-4 ll:rounded-md ll:border ll-custom-cursor-pointer ll:transition-colors ll:motion-reduce:transition-none",
                      {
                        "ll:ring-2 ll:ring-white": isSelected,
                      },
                    )}
                    style={{
                      backgroundColor: swatchColor,
                      borderColor: swatchColor,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {defaultColorNames[colorId] ??
                    getDefaultColorName(colorId, legacyAppearance)}
                </TooltipContent>
              </Tooltip>
            );
          })}
          {Object.values(customColors).map((color) => {
            const isSelected = selectedColors.has(color.id);

            return (
              <Tooltip key={color.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={color.name}
                    aria-pressed={isSelected}
                    onClick={() => handleToggleColor(color.id)}
                    className={cn(
                      "ll:p-0 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:size-4 ll:rounded-md ll:border ll-custom-cursor-pointer ll:transition-colors ll:motion-reduce:transition-none",
                      {
                        "ll:ring-2 ll:ring-white": isSelected,
                        "ll:opacity-50": !isSelected,
                      },
                    )}
                    style={{
                      backgroundColor: color.borderColor,
                      borderColor: color.borderColor,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>{color.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
};
