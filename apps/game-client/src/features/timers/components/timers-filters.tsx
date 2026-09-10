import { Input } from "@/components/ui/input";
import { NPC_NAMES } from "@/constants/margonem";
import { NpcType } from "@/api/npcs.api";
import { cn } from "cn";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";
import type { FC } from "react";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { getDefaultColorName } from "@/features/timers/utils/get-default-color-name";

const NPC_TYPES_OPTIONS = [
  NpcType.ELITE2,
  NpcType.ELITE3,
  NpcType.HERO,
  NpcType.TITAN,
];
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
  } = useTimersStore();

  const filters = timersFilters[filtersKey] ?? DEFAULT_TIMERS_FILTERS;
  const selectedNpcTypes = new Set(filters.selectedNpcTypes);
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

  const handleToggleNpcType = (npcType: NpcType) => {
    setTimersFilters(filtersKey, {
      ...filters,
      selectedNpcTypes: filters.selectedNpcTypes.includes(npcType)
        ? filters.selectedNpcTypes.filter((type) => type !== npcType)
        : [...filters.selectedNpcTypes, npcType],
    });
  };

  const handleSelectOnlyNpcType = (
    event: React.MouseEvent<HTMLButtonElement>,
    npcType: NpcType,
  ) => {
    event.preventDefault();
    setTimersFilters(filtersKey, {
      ...filters,
      selectedNpcTypes: [npcType],
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
        <div className="ll:flex ll-custom-cursor-pointer ll:items-center ll:justify-center ll:border-solid ll:border-gray-400 ll:box-border ll:border ll:rounded-sm ll:bg-gray-500/30 ll:transition-colors ll:motion-reduce:transition-none">
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
                  "ll:bg-transparent ll:border-0 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:flex ll:items-center ll:justify-center ll:gap-2 ll:hover:bg-gray-400/50 ll:px-1 ll:py-0.5 ll:box-border ll:text-white ll:text-xs",
                  {
                    "ll:border-r ll:border-r-white ll:border-solid": isNotLast,
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
        <div className="ll:flex ll:flex-row ll:gap-1 ll:flex-wrap ll:border-solid ll:border-gray-400 ll:box-border ll:border ll:rounded-sm ll:p-1">
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
                      "ll:p-0 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:size-4 ll:rounded-md ll:box-border ll:border ll-custom-cursor-pointer ll:transition-colors ll:motion-reduce:transition-none",
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
                      "ll:p-0 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:size-4 ll:rounded-md ll:box-border ll:border ll-custom-cursor-pointer ll:transition-colors ll:motion-reduce:transition-none",
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
