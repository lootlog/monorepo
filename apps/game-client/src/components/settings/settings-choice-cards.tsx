import {
  SettingsChoiceCard,
  type SettingsChoiceOption,
} from "@/components/settings/settings-choice-card";
import { cn } from "cn";
import type { KeyboardEvent } from "react";

type SettingsChoiceCardsProps<Value extends string> = {
  id?: string;
  label: string;
  options: readonly SettingsChoiceOption<Value>[];
  /** `null` renders the group with no selected card. */
  value: Value | null;
  disabled?: boolean;
  onChange: (value: Value) => void;
  className?: string;
};

const findIndex = <Value extends string>(
  options: readonly SettingsChoiceOption<Value>[],
  value: Value | null,
) =>
  Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

/**
 * Radio group rendered as a grid of cards. One card per option: title,
 * optional one-line description and a check mark on the selected one.
 */
export const SettingsChoiceCards = <Value extends string>({
  id,
  label,
  options,
  value,
  disabled = false,
  onChange,
  className,
}: SettingsChoiceCardsProps<Value>) => {
  // With nothing selected the first enabled card carries the roving tab stop.
  const focusableValue =
    options.find((option) => !option.disabled)?.value ?? null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;

    if (delta === 0 || disabled) return;
    event.preventDefault();
    let index = findIndex(options, value);

    for (let step = 0; step < options.length; step += 1) {
      index = (index + delta + options.length) % options.length;
      const next = options[index];

      if (next && !next.disabled) {
        onChange(next.value);

        return;
      }
    }
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={label}
      className={cn(
        "ll:grid ll:gap-1 ll:px-2 ll:pt-1 ll:grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))]",
        className,
      )}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => (
        <SettingsChoiceCard
          key={option.value}
          option={option}
          selected={option.value === value}
          disabled={disabled || option.disabled === true}
          tabIndex={option.value === (value ?? focusableValue) ? 0 : -1}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </div>
  );
};
