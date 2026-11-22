import { Input } from "@/components/ui/input";
import { cn } from "cn";
import { useRef, type FC, type KeyboardEvent } from "react";
import { useSourceDraft } from "./use-source-draft";

type SettingsNumberFieldProps = {
  id?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  variant?: "default" | "cell";
  "aria-label"?: string;
  className?: string;
  onCommit: (value: number) => void;
};

const clampSettingsNumber = (
  value: number,
  min: number,
  max: number,
  step = 1,
) => {
  if (Number.isNaN(value)) return min;
  const clamped = Math.min(max, Math.max(min, value));

  return step >= 1 ? Math.round(clamped) : clamped;
};

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
  const [text, setText, clearDraft] = useSourceDraft(value, String(value));
  const cancelled = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;

      return;
    }

    const next = clampSettingsNumber(Number.parseFloat(text), min, max, step);
    clearDraft();

    if (next !== value) onCommit(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelled.current = true;
      clearDraft();
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
        onChange={(event) => setText(event.target.value)}
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
            "ll:shrink-0 ll:text-xs ll:text-muted-foreground",
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
