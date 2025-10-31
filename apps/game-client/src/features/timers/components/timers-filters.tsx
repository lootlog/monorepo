import { Input } from "@/components/ui/input";
import { NPC_NAMES } from "@/constants/margonem";
import { NpcType } from "@/hooks/api/use-npcs";
import { cn } from "@/lib/utils";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";
import { FC } from "react";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NPC_TYPES_OPTIONS = [
  NpcType.ELITE3,
  NpcType.ELITE2,
  NpcType.HERO,
  NpcType.TITAN,
];
const MAX_LVL = 500;
const MIN_LVL = 0;

const DEFAULT_COLOR_NAMES: Record<string, string> = {
  red: "Czerwony",
  orange: "Pomarańczowy",
  yellow: "Żółty",
  lime: "Limonkowy",
  green: "Zielony",
  teal: "Turkusowy",
  sky: "Niebieski",
  blue: "Granatowy",
  violet: "Fioletowy",
  purple: "Purpurowy",
  pink: "Różowy",
  white: "Biały",
};

const clampValue = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export type TimersFiltersProps = {
  filtersKey: string;
};

export const TimersFilters: FC<TimersFiltersProps> = ({ filtersKey }) => {
  const {
    timerFiltersSearchText,
    setTimerFiltersSearchText,
    timersFilters,
    setTimersFilters,
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
    hiddenDefaultColors,
  } = useTimersStore();

  const filters = timersFilters[filtersKey] || DEFAULT_TIMERS_FILTERS;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimerFiltersSearchText(e.target.value);
  };

  const handleMinLvlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = Number(e.target.value);

    if (isNaN(numericValue)) return;

    const clampedValue = clampValue(numericValue, MIN_LVL, MAX_LVL);

    setTimersFilters(filtersKey, {
      ...filters,
      minLvl: clampedValue,
    });
  };

  const handleMaxLvlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = Number(e.target.value);

    if (isNaN(numericValue)) return;

    const clampedValue = clampValue(numericValue, MIN_LVL, MAX_LVL);
    setTimersFilters(filtersKey, {
      ...filters,
      maxLvl: clampedValue,
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

  const handleToggleColor = (colorId: string) => {
    setTimersFilters(filtersKey, {
      ...filters,
      selectedColors: filters.selectedColors.includes(colorId)
        ? filters.selectedColors.filter((id) => id !== colorId)
        : [...filters.selectedColors, colorId],
    });
  };

  return (
    <div className="ll:flex ll:flex-col ll:gap-1 ll:mb-1">
      <div className="ll:flex ll:flex-row ll:gap-1 ll:flex-nowrap">
        <Input
          placeholder="Szukaj..."
          value={timerFiltersSearchText}
          onChange={handleSearchChange}
        />
        <div className="ll:w-[4.5rem]">
          <Input
            placeholder="Od"
            value={filters.minLvl.toString()}
            onChange={handleMinLvlChange}
            className="ll:w-8 input-no-spinner"
            max={MAX_LVL}
            min={MIN_LVL}
            type="number"
            inputMode="numeric"
          />
        </div>
        <div className="ll:w-[4.5rem]">
          <Input
            placeholder="Do"
            value={filters.maxLvl.toString()}
            onChange={handleMaxLvlChange}
            className="ll:w-8 input-no-spinner"
            min={MIN_LVL}
            max={MAX_LVL}
            type="number"
            inputMode="numeric"
          />
        </div>
        <div className="ll:flex ll-custom-cursor-pointer ll:items-center ll:justify-center ll:border-solid ll:border-gray-400 ll:box-border ll:border ll:rounded-sm ll:bg-gray-500/30 ll:transition-all">
          {NPC_TYPES_OPTIONS.map((type, index) => {
            const npc = NPC_NAMES[type];
            const isSelected = filters.selectedNpcTypes.includes(type);
            const isNotLast = index < NPC_TYPES_OPTIONS.length - 1;

            return (
              <div
                key={type}
                role="button"
                onClick={() => handleToggleNpcType(type)}
                className={cn(
                  "ll:flex ll:items-center ll:justify-center ll:gap-2 ll:hover:bg-gray-400/50 ll:px-1 ll:py-0.5 ll:box-border ll:text-white ll:text-xs",
                  {
                    "ll:border-r ll:border-r-white ll:border-solid": isNotLast,
                    "ll:bg-gray-400/30": isSelected,
                  },
                )}
              >
                {npc.shortname}
              </div>
            );
          })}
        </div>
      </div>
      <div className="ll:flex ll:flex-row ll:gap-1 ll:flex-wrap ll:border-solid ll:border-gray-400 ll:box-border ll:border ll:rounded-sm ll:p-1">
        {Object.entries(TIMERS_COLORS)
          .filter(([colorId]) => !hiddenDefaultColors.includes(colorId))
          .map(([colorId, color]) => {
            const isSelected = filters.selectedColors.includes(colorId);
            const overridden = overriddenDefaultColors[colorId];
            return (
              <Tooltip key={colorId}>
                <TooltipTrigger asChild>
                  <div
                    role="button"
                    onClick={() => handleToggleColor(colorId)}
                    className={cn(
                      "ll:size-4 ll:rounded-md ll:box-border ll:border ll-custom-cursor-pointer ll:transition-all",
                      !overridden && color?.bgNoOpacity,
                      !overridden && color?.border,
                      {
                        "ll:ring-2 ll:ring-white": isSelected,
                        "ll:opacity-50": !isSelected,
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
                  {defaultColorNames[colorId] || DEFAULT_COLOR_NAMES[colorId]}
                </TooltipContent>
              </Tooltip>
            );
          })}
        {Object.values(customColors).map((color) => {
          const isSelected = filters.selectedColors.includes(color.id);
          return (
            <Tooltip key={color.id}>
              <TooltipTrigger asChild>
                <div
                  role="button"
                  onClick={() => handleToggleColor(color.id)}
                  className={cn(
                    "ll:size-4 ll:rounded-md ll:box-border ll:border ll-custom-cursor-pointer ll:transition-all",
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
    </div>
  );
};
