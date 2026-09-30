import { clamp } from "es-toolkit";
import { cn } from "cn";
import type { ChangeEvent, FC } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { toolbarStripLightDividerClassName } from "@/components/ui/toolbar-strip";

export type LevelRange = {
  minLvl: number;
  maxLvl: number;
};

type LevelRangeFilterProps = {
  value: LevelRange;
  /** Lowest and highest level either bound accepts; typed values clamp to it. */
  min: number;
  max: number;
  onChange: (value: LevelRange) => void;
};

/**
 * The "level from / to" pair of a toolbar filter strip. Typed values clamp to
 * the allowed range, input that is not a number keeps the previous bound, and
 * moving one bound past the other drags the other along, so the range never
 * silently matches nothing.
 */
export const LevelRangeFilter: FC<LevelRangeFilterProps> = ({
  value,
  min,
  max,
  onChange,
}) => {
  const { t } = useTranslation("common");

  const handleChange = (
    field: keyof LevelRange,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const level = Number(event.target.value);

    if (Number.isNaN(level)) return;

    const bound = clamp(level, min, max);

    onChange(
      field === "minLvl"
        ? { minLvl: bound, maxLvl: Math.max(bound, value.maxLvl) }
        : { minLvl: Math.min(bound, value.minLvl), maxLvl: bound },
    );
  };

  const fields = [
    { field: "minLvl", label: t("filters.minLevel") },
    { field: "maxLvl", label: t("filters.maxLevel") },
  ] as const;

  return fields.map(({ field, label }) => (
    <Input
      key={field}
      aria-label={label}
      value={value[field].toString()}
      onChange={(event) => handleChange(field, event)}
      className={cn(
        toolbarStripLightDividerClassName,
        "ll:w-8 ll:shrink-0 input-no-spinner ll:px-0.5 ll:text-center",
      )}
      min={min}
      max={max}
      type="number"
      inputMode="numeric"
      variant="borderless"
    />
  ));
};
