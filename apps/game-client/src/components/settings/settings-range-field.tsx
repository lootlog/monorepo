import { SettingsNumberField } from "@/components/settings/settings-number-field";
import { Slider } from "@/components/ui/slider";
import { cn } from "cn";
import { useState, type FC } from "react";

type SettingsRangeFieldProps = {
  /** Current `[from, to]` pair; `from` never exceeds `to`. */
  value: readonly [number, number];
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  /** Accessible names of the two numeric ends. */
  fromLabel: string;
  toLabel: string;
  /** Accessible name of the slider and both of its thumbs. */
  sliderLabel: string;
  className?: string;
  /** Called with a normalised, clamped pair on blur, Enter or drag end. */
  onCommit: (value: [number, number]) => void;
};

const normalizeRange = (
  [from, to]: readonly [number, number],
  min: number,
  max: number,
): [number, number] => {
  const low = Math.min(max, Math.max(min, from));
  const high = Math.min(max, Math.max(min, to));

  return [Math.min(low, high), Math.max(low, high)];
};

/**
 * A "from … to" pair: two numeric fields joined by a two-thumb slider, so the
 * span reads at a glance and can be dragged or typed. Dragging updates the
 * fields locally and commits once, like the single-value slider.
 */
export const SettingsRangeField: FC<SettingsRangeFieldProps> = ({
  value,
  min,
  max,
  step = 1,
  disabled,
  fromLabel,
  toLabel,
  sliderLabel,
  className,
  onCommit,
}) => {
  const [draft, setDraft] = useState<{
    source: readonly [number, number];
    value: [number, number];
  } | null>(null);

  const current = draft && draft.source === value ? draft.value : value;

  const commit = (next: readonly [number, number]) => {
    setDraft(null);
    const normalized = normalizeRange(next, min, max);

    if (normalized[0] !== value[0] || normalized[1] !== value[1]) {
      onCommit(normalized);
    }
  };

  return (
    <span
      className={cn(
        "ll:inline-flex ll:w-full ll:items-center ll:gap-2",
        className,
      )}
    >
      <SettingsNumberField
        aria-label={fromLabel}
        value={current[0]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onCommit={(from) => commit([from, current[1]])}
      />
      <span className="ll:min-w-12 ll:flex-1">
        <Slider
          aria-label={sliderLabel}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={[current[0], current[1]]}
          onValueChange={(next) => {
            if (Array.isArray(next) && next.length === 2) {
              setDraft({ source: value, value: [next[0], next[1]] });
            }
          }}
          onValueCommitted={(next) => {
            if (Array.isArray(next) && next.length === 2) {
              commit([next[0], next[1]]);
            }
          }}
        />
      </span>
      <SettingsNumberField
        aria-label={toLabel}
        value={current[1]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onCommit={(to) => commit([current[0], to])}
      />
    </span>
  );
};
