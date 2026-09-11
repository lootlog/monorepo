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
  /**
   * `cell` fills a grid cell: no border, no spin buttons, typing straight
   * into the cell; the frame appears only on focus.
   */
  variant?: "default" | "cell";
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
  variant = "default",
  "aria-label": ariaLabel,
  className,
  onCommit,
}) => {
  const [draft, setDraft] = useState<{ source: number; text: string } | null>(
    null,
  );

  const cancelled = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
    <span
      className={cn(
        "ll:items-center",
        variant === "cell"
          ? "ll:relative ll:flex ll:h-full ll:w-full ll:min-w-14 ll:gap-0 ll:transition-colors ll:hover:bg-white/5 ll:focus-within:shadow-[inset_0_0_0_1px_var(--color-ring)]"
          : "ll:inline-flex ll:gap-1",
        className,
      )}
      // The whole cell is the click target; the field itself stays narrow so
      // the value sits centred under the column icon.
      onClick={variant === "cell" ? () => inputRef.current?.focus() : undefined}
    >
      <Input
        ref={inputRef}
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={text}
        disabled={disabled}
        aria-label={ariaLabel}
        variant={variant === "cell" ? "borderless" : "default"}
        onChange={(event) =>
          setDraft({ source: value, text: event.target.value })
        }
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={cn(
          "ll:text-right ll:tabular-nums",
          variant === "cell"
            ? "ll:h-full ll:flex-1 ll:px-0.5 ll:text-center ll:[appearance:textfield] ll:[&::-webkit-inner-spin-button]:appearance-none ll:[&::-webkit-outer-spin-button]:appearance-none"
            : "ll:w-16",
        )}
      />
      {unit ? (
        <span
          className={cn(
            "ll:shrink-0 ll:text-[11px] ll:text-muted-foreground",
            // Hangs right of the centred value so the digits stay under the icon.
            variant === "cell"
              ? "ll:pointer-events-none ll:absolute ll:top-1/2 ll:left-[calc(50%+0.8em)] ll:-translate-y-1/2"
              : "ll:w-5",
          )}
        >
          {unit}
        </span>
      ) : null}
    </span>
  );
};
