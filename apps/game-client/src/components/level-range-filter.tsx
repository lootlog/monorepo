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
  min: number;
  max: number;
  onChange: (value: LevelRange) => void;
};

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
