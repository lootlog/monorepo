import { Slider } from "@/components/ui/slider";
import { cn } from "cn";
import { useState, type FC } from "react";

type SettingsSliderFieldProps = {
  id?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Unit appended to the readout, e.g. "%" or "px". */
  unit?: string;
  disabled?: boolean;
  "aria-label": string;
  className?: string;
  /** Formats the readout; defaults to the raw value followed by the unit. */
  formatValue?: (value: number) => string;
  /** Called while dragging with the live value; optional live preview hook. */
  onValueChange?: (value: number) => void;
  /** Called once the drag or keyboard change ends. */
  onCommit: (value: number) => void;
};

/**
 * Slider with a value readout. Drag updates the readout locally and the value
 * is committed once the interaction ends, so autosave is not hit per frame.
 */
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
  const [draft, setDraft] = useState<{ source: number; value: number } | null>(
    null,
  );

  const current = draft && draft.source === value ? draft.value : value;
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
            setDraft({ source: value, value: next });
            onValueChange?.(next);
          }}
          onValueCommitted={(next) => {
            setDraft(null);
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
