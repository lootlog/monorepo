import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NPC_NAMES } from "@/constants/margonem";
import type { NpcType } from "@/api/npcs.api";
import type { TimersColorPreferences } from "@/features/timers/hooks/use-timers-window-model";
import {
  TIMER_FILTER_MAX_LVL,
  TIMER_FILTER_MIN_LVL,
  TIMER_FILTER_NPC_TYPES,
  useTimersFiltersController,
} from "@/features/timers/hooks/use-timers-filters-controller";
import {
  getDefaultColorName,
  getTimerColorHex,
  TIMERS_COLORS,
} from "@/features/timers/model/timer-colors";

type ModernTimersFiltersProps = {
  filtersKey: string;
  colors: TimersColorPreferences;
  colorFiltersEnabled: boolean;
};

/**
 * One row of same-height controls (search, level range, NPC types) like the
 * online players window, plus a row of colour chips when colour filters are on.
 */
export const ModernTimersFilters: FC<ModernTimersFiltersProps> = ({
  filtersKey,
  colors,
  colorFiltersEnabled,
}) => {
  const { t } = useTranslation("timers");

  const {
    filters,
    searchText,
    selectedNpcTypes,
    selectedColors,
    handleSearchChange,
    handleLevelChange,
    toggleNpcType,
    selectOnlyNpcType,
    toggleColor,
    clearSearch,
  } = useTimersFiltersController(filtersKey);

  const hiddenColors = new Set(colors.hiddenDefaultColors);

  const colorChips = [
    ...Object.keys(TIMERS_COLORS).flatMap((colorId) => {
      if (hiddenColors.has(colorId)) return [];
      const overridden = colors.overriddenDefaultColors[colorId];
      const hex = getTimerColorHex(colorId);

      return [
        {
          id: colorId,
          name:
            colors.defaultColorNames[colorId] ?? getDefaultColorName(colorId),
          backgroundColor: overridden?.backgroundColor ?? hex?.border,
          borderColor: overridden?.borderColor ?? hex?.border,
        },
      ];
    }),
    ...Object.values(colors.customColors).map((color) => ({
      id: color.id,
      name: color.name,
      backgroundColor: color.backgroundColor,
      borderColor: color.borderColor,
    })),
  ];

  return (
    <div className="ll:flex ll:flex-col ll:gap-1">
      <div className="ll:flex ll:items-center ll:gap-1">
        <SearchInput
          size="sm"
          placeholder={t("filters.searchPlaceholder")}
          value={searchText}
          onChange={handleSearchChange}
          onClear={clearSearch}
          clearLabel={t("actions.clear", { ns: "common" })}
        />
        <Input
          aria-label={t("filters.minPlaceholder")}
          value={filters.minLvl.toString()}
          onChange={(event) => handleLevelChange("minLvl", event)}
          className="ll:w-9 input-no-spinner ll:px-0.5 ll:text-center"
          max={TIMER_FILTER_MAX_LVL}
          min={TIMER_FILTER_MIN_LVL}
          type="number"
          inputMode="numeric"
        />
        <Input
          aria-label={t("filters.maxPlaceholder")}
          value={filters.maxLvl.toString()}
          onChange={(event) => handleLevelChange("maxLvl", event)}
          className="ll:w-9 input-no-spinner ll:px-0.5 ll:text-center"
          max={TIMER_FILTER_MAX_LVL}
          min={TIMER_FILTER_MIN_LVL}
          type="number"
          inputMode="numeric"
        />
        <ToggleGroup
          multiple
          variant="outline"
          size="sm"
          spacing={0}
          value={[...selectedNpcTypes]}
          onValueChange={(values: NpcType[]) => {
            const changed = TIMER_FILTER_NPC_TYPES.find(
              (type) => values.includes(type) !== selectedNpcTypes.has(type),
            );

            if (changed) toggleNpcType(changed);
          }}
          aria-label={t("filters.typesLabel")}
          className="ll:shrink-0"
        >
          {TIMER_FILTER_NPC_TYPES.map((type) => (
            <ToggleGroupItem
              key={type}
              value={type}
              aria-label={NPC_NAMES[type].longname}
              className="ll:px-1.5 ll:text-[11px]"
              onContextMenu={(event) => selectOnlyNpcType(event, type)}
            >
              {NPC_NAMES[type].shortname}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {colorFiltersEnabled && (
        <div
          role="group"
          aria-label={t("filters.colorsLabel")}
          className="ll:flex ll:flex-wrap ll:items-center ll:gap-1"
        >
          {colorChips.map((chip) => {
            const isSelected = selectedColors.has(chip.id);

            return (
              <Tooltip key={chip.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={chip.name}
                    aria-pressed={isSelected}
                    onClick={() => toggleColor(chip.id)}
                    className={cn(
                      "ll-custom-cursor-pointer ll:size-3.5 ll:rounded-full ll:border ll:border-solid ll:p-0 ll:transition-[opacity,box-shadow] ll:motion-reduce:transition-none ll:focus-visible:outline-2 ll:focus-visible:outline-ring",
                      isSelected
                        ? "ll:opacity-100 ll:ring-2 ll:ring-white/80"
                        : "ll:opacity-45 ll:hover:opacity-80",
                    )}
                    style={{
                      backgroundColor: chip.backgroundColor,
                      borderColor: chip.borderColor,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="ll:text-xs">
                  {chip.name}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
};
