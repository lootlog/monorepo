import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

/** Vertical rule between neighbouring controls of the flat filters strip. */
const FILTER_DIVIDER_CLASS_NAME =
  "ll:border-0 ll:border-l ll:border-solid ll:border-gray-400/40";

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
    <div className="ll:-mx-1 ll:-mt-px ll:flex ll:flex-col ll:border-y ll:border-x-0 ll:border-gray-400/40 ll:bg-black/20">
      <div className="ll:flex ll:h-7 ll:min-w-0 ll:items-stretch">
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
            FILTER_DIVIDER_CLASS_NAME,
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
            FILTER_DIVIDER_CLASS_NAME,
            "ll:w-8 ll:shrink-0 input-no-spinner ll:px-0.5 ll:text-center",
          )}
          min={MIN_LVL}
          max={MAX_LVL}
          type="number"
          inputMode="numeric"
          variant="borderless"
        />
        <ToggleGroup
          aria-label={t("filters.npcTypesLabel")}
          className="ll:h-full ll:shrink-0 ll:rounded-none"
          multiple
          onValueChange={(selectedNpcTypes: NpcType[]) =>
            setTimersFilters(filtersKey, { ...filters, selectedNpcTypes })
          }
          size="sm"
          spacing={0}
          value={filters.selectedNpcTypes}
        >
          {NPC_TYPES_OPTIONS.map((type) => (
            <ToggleGroupItem
              key={type}
              value={type}
              className={cn(
                FILTER_DIVIDER_CLASS_NAME,
                "ll:h-full ll:min-w-6! ll:rounded-none! ll:px-1!",
              )}
              onContextMenu={(event) => handleSelectOnlyNpcType(event, type)}
            >
              {NPC_NAMES[type].shortname}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {colorFiltersEnabled && (
        <div className="ll:flex ll:flex-row ll:flex-wrap ll:gap-1 ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40 ll:px-1 ll:py-1">
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
