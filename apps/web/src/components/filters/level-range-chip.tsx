import { Button } from "@lootlog/ui/components/button";
import { FilterChipTrigger } from "@lootlog/ui/components/filter-chip-trigger";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Signal } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  LevelRangeInputs,
  type LevelRangeInputsProps,
} from "./level-range-inputs";

/** Common hunting brackets, one click each. */
const PRESETS = [
  [1, 100],
  [100, 200],
  [200, 300],
  [300, 500],
] as const;

/** The level range in a filter bar: one chip whose popover holds the bounds. */
export function LevelRangeChip(props: LevelRangeInputsProps) {
  const { t } = useTranslation();
  const { minLevel, maxLevel, onMinLevelChange, onMaxLevelChange } = props;
  const active = minLevel !== undefined || maxLevel !== undefined;

  const value =
    minLevel !== undefined && maxLevel !== undefined
      ? `${minLevel}–${maxLevel}`
      : minLevel !== undefined
        ? t("ui.levelRange.from", { level: minLevel })
        : maxLevel !== undefined
          ? t("ui.levelRange.to", { level: maxLevel })
          : t("ui.levelRange.any");

  const setRange = (min: number | undefined, max: number | undefined) => {
    onMinLevelChange(min);
    onMaxLevelChange(max);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <FilterChipTrigger
            icon={Signal}
            label={t("ui.levelRange.short")}
            value={value}
            active={active}
          />
        }
      />
      <PopoverContent align="end" className="flex w-64 flex-col gap-3 p-3">
        <LevelRangeInputs {...props} size="default" />
        <div className="grid grid-cols-4 gap-1">
          {PRESETS.map(([min, max]) => (
            <Button
              key={min}
              type="button"
              variant="ghost"
              size="sm"
              className="px-0 tabular-nums"
              onClick={() => setRange(min, max)}
            >
              {min}–{max}
            </Button>
          ))}
        </div>
        {active && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRange(undefined, undefined)}
          >
            {t("ui.levelRange.clear")}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
