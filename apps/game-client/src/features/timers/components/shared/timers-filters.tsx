import { Input } from "@/components/ui/input";
import { NPC_NAMES } from "@/constants/margonem";
import { cn } from "cn";
import type { FC } from "react";
import {
  getDefaultColorName,
  TIMERS_COLORS,
} from "@/features/timers/model/timer-colors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import type { TimersColorPreferences } from "@/features/timers/hooks/use-timers-window-model";
import {
  TIMER_FILTER_MAX_LVL,
  TIMER_FILTER_MIN_LVL,
  TIMER_FILTER_NPC_TYPES,
  useTimersFiltersController,
} from "@/features/timers/hooks/use-timers-filters-controller";

const NPC_TYPES_OPTIONS = TIMER_FILTER_NPC_TYPES;

const MAX_LVL = TIMER_FILTER_MAX_LVL;

const MIN_LVL = TIMER_FILTER_MIN_LVL;

type TimersFiltersProps = {
  filtersKey: string;
  colors: TimersColorPreferences;
  colorFiltersEnabled: boolean;
};

/** The legacy layout's filter block, kept as it was. */
export const TimersFilters: FC<TimersFiltersProps> = ({
  filtersKey,
  colors,
  colorFiltersEnabled,
}) => {
  const { t } = useTranslation("timers");

  const {
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
    hiddenDefaultColors,
  } = colors;

  const {
    filters,
    searchText: timerFiltersSearchText,
    selectedNpcTypes,
    selectedColors,
    handleSearchChange,
    handleLevelChange,
    toggleNpcType: handleToggleNpcType,
    selectOnlyNpcType: handleSelectOnlyNpcType,
    toggleColor: handleToggleColor,
  } = useTimersFiltersController(filtersKey);

  const hiddenColors = new Set(hiddenDefaultColors);

  return (
    <div className="ll:flex ll:flex-col ll:gap-1 ll:mb-1">
      <div className="ll:flex ll:flex-row ll:gap-1 ll:flex-nowrap">
        <Input
          placeholder={t("filters.searchPlaceholder")}
          value={timerFiltersSearchText}
          onChange={handleSearchChange}
        />
        <div className="ll:w-18">
          <Input
            placeholder={t("filters.minPlaceholder")}
            value={filters.minLvl.toString()}
            onChange={(event) => handleLevelChange("minLvl", event)}
            className="ll:w-8 input-no-spinner"
            max={MAX_LVL}
            min={MIN_LVL}
            type="number"
            inputMode="numeric"
          />
        </div>
        <div className="ll:w-18">
          <Input
            placeholder={t("filters.maxPlaceholder")}
            value={filters.maxLvl.toString()}
            onChange={(event) => handleLevelChange("maxLvl", event)}
            className="ll:w-8 input-no-spinner"
            min={MIN_LVL}
            max={MAX_LVL}
            type="number"
            inputMode="numeric"
          />
        </div>
        <div className="ll:flex ll-custom-cursor-pointer ll:items-center ll:justify-center ll:border-gray-400 ll:border ll:rounded-sm ll:bg-gray-500/30 ll:transition-colors ll:motion-reduce:transition-none">
          {NPC_TYPES_OPTIONS.map((type, index) => {
            const npc = NPC_NAMES[type];
            const isSelected = selectedNpcTypes.has(type);
            const isNotLast = index < NPC_TYPES_OPTIONS.length - 1;

            return (
              <button
                key={type}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleToggleNpcType(type)}
                onContextMenu={(event) => handleSelectOnlyNpcType(event, type)}
                className={cn(
                  "ll:bg-transparent ll:border-0 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:flex ll:items-center ll:justify-center ll:gap-2 ll:hover:bg-gray-400/50 ll:px-1 ll:py-0.5 ll:text-white ll:text-xs",
                  {
                    "ll:border-r ll:border-r-white": isNotLast,
                    "ll:bg-gray-400/30": isSelected,
                  },
                )}
              >
                {npc.shortname}
              </button>
            );
          })}
        </div>
      </div>
      {colorFiltersEnabled && (
        <div className="ll:flex ll:flex-row ll:gap-1 ll:flex-wrap ll:border-gray-400 ll:border ll:rounded-sm ll:p-1">
          {Object.entries(TIMERS_COLORS).flatMap(([colorId, color]) => {
            if (hiddenColors.has(colorId)) return [];
            const isSelected = selectedColors.has(colorId);
            const overridden = overriddenDefaultColors[colorId];

            return (
              <Tooltip key={colorId}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={
                      defaultColorNames[colorId] ?? getDefaultColorName(colorId)
                    }
                    aria-pressed={isSelected}
                    onClick={() => handleToggleColor(colorId)}
                    className={cn(
                      "ll:p-0 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:size-4 ll:rounded-md ll:border ll-custom-cursor-pointer ll:transition-colors ll:motion-reduce:transition-none",
                      !overridden && color?.bgNoOpacity,
                      !overridden && color?.border,
                      {
                        "ll:ring-2 ll:ring-white": isSelected,
                      },
                    )}
                    style={
                      overridden
                        ? {
                            backgroundColor: overridden.backgroundColor,
                            borderColor: overridden.borderColor,
                          }
                        : undefined
                    }
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="ll:text-xs">
                  {defaultColorNames[colorId] ?? getDefaultColorName(colorId)}
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
                      backgroundColor: color.backgroundColor,
                      borderColor: color.borderColor,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="ll:text-xs">
                  {color.name}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
};
