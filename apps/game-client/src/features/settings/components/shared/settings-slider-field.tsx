import { Slider } from "@/components/ui/slider";
import { cn } from "cn";
import type { FC } from "react";
import { useSourceDraft } from "./use-source-draft";

type SettingsSliderFieldProps = {
  id?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  "aria-label": string;
  className?: string;
  formatValue?: (value: number) => string;
  onValueChange?: (value: number) => void;
  onCommit: (value: number) => void;
};

export const SettingsSliderField: FC<SettingsSliderFieldProps> = ({
  id,
  value,
  min,
  max,
  step = 1,
  unit = "",
  disabled,
  "aria-label": ariaLabel,
  className,
  formatValue,
  onValueChange,
  onCommit,
}) => {
  const [current, setCurrent, clearDraft] = useSourceDraft(value, value);
  const readout = formatValue ? formatValue(current) : `${current}${unit}`;

  return (
    <span
      className={cn(
        "ll:inline-flex ll:w-full ll:items-center ll:gap-2",
        className,
      )}
    >
      <span className="ll:min-w-0 ll:flex-1">
        <Slider
          id={id}
          aria-label={ariaLabel}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={current}
          onValueChange={(next) => {
            setCurrent(next);
            onValueChange?.(next);
          }}
          onValueCommitted={(next) => {
            clearDraft();
            onCommit(next);
          }}
        />
      </span>
      <span className="ll:w-10 ll:shrink-0 ll:text-right ll:text-xs ll:tabular-nums ll:text-muted-foreground">
        {readout}
      </span>
    </span>
  );
};
