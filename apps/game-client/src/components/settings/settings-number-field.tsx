import { Input } from "@/components/ui/input";
import { cn } from "cn";
import { useRef, useState, type FC, type KeyboardEvent } from "react";

type SettingsNumberFieldProps = {
  id?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Short unit shown after the field, e.g. "s" or "px". */
  unit?: string;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
  /** Called with a value already clamped to [min, max] on blur or Enter. */
  onCommit: (value: number) => void;
};

export const clampSettingsNumber = (
  value: number,
  min: number,
  max: number,
  step = 1,
) => {
  if (Number.isNaN(value)) return min;
  const clamped = Math.min(max, Math.max(min, value));

  return step >= 1 ? Math.round(clamped) : clamped;
};

/**
 * Numeric input for settings: edits stay local while typing and the clamped
 * value is committed on blur or Enter, so a half-typed number never persists.
 */
export const SettingsNumberField: FC<SettingsNumberFieldProps> = ({
  id,
  value,
  min,
  max,
  step = 1,
  unit,
  disabled,
  "aria-label": ariaLabel,
  className,
  onCommit,
}) => {
  const [draft, setDraft] = useState<{ source: number; text: string } | null>(
    null,
  );

  const cancelled = useRef(false);
  const text = draft && draft.source === value ? draft.text : String(value);

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;

      return;
    }

    const next = clampSettingsNumber(Number.parseFloat(text), min, max, step);
    setDraft(null);

    if (next !== value) onCommit(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      cancelled.current = true;
      setDraft(null);
      event.currentTarget.blur();
    }
  };

  return (
    <span className={cn("ll:inline-flex ll:items-center ll:gap-1", className)}>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={text}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) =>
          setDraft({ source: value, text: event.target.value })
        }
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="ll:w-16 ll:text-right ll:tabular-nums"
      />
      {unit ? (
        <span className="ll:w-5 ll:shrink-0 ll:text-[11px] ll:text-muted-foreground">
          {unit}
        </span>
      ) : null}
    </span>
  );
};
