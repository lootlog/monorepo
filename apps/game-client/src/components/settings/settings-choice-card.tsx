import { cn } from "cn";
import { Check } from "lucide-react";
import type { FC, KeyboardEvent, ReactNode } from "react";

export type SettingsChoiceOption<Value extends string> = {
  value: Value;
  title: ReactNode;
  description?: ReactNode;
  /** Shown in place but not selectable, so the grid keeps its layout. */
  disabled?: boolean;
};

type SettingsChoiceCardsProps<Value extends string> = {
  id?: string;
  label: string;
  options: readonly SettingsChoiceOption<Value>[];
  value: Value;
  disabled?: boolean;
  onChange: (value: Value) => void;
  className?: string;
};

const findIndex = <Value extends string>(
  options: readonly SettingsChoiceOption<Value>[],
  value: Value,
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
          tabIndex={option.value === value ? 0 : -1}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </div>
  );
};

type SettingsChoiceCardProps<Value extends string> = {
  option: SettingsChoiceOption<Value>;
  selected: boolean;
  disabled: boolean;
  tabIndex: number;
  onSelect: () => void;
};

const SettingsChoiceCard: FC<SettingsChoiceCardProps<string>> = ({
  option,
  selected,
  disabled,
  tabIndex,
  onSelect,
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    tabIndex={tabIndex}
    disabled={disabled}
    data-selected={selected}
    onClick={onSelect}
    className="ll-custom-cursor-pointer ll:group ll:flex ll:min-w-0 ll:flex-col ll:gap-0.5 ll:rounded-sm ll:border-0 ll:bg-black/25 ll:p-2 ll:text-left ll:transition-[background-color,box-shadow] ll:hover:bg-white/5 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:disabled:opacity-60 ll:data-[selected=true]:bg-primary/15 ll:data-[selected=true]:shadow-[inset_0_0_0_1px_var(--color-primary)] ll:data-[selected=true]:hover:bg-primary/20"
  >
    <span className="ll:flex ll:w-full ll:items-start ll:justify-between ll:gap-2">
      <span className="ll:text-[13px] ll:font-semibold ll:leading-4 ll:text-foreground">
        {option.title}
      </span>
      <span
        aria-hidden
        className="ll:flex ll:size-4 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-full ll:bg-primary ll:text-primary-foreground ll:transition-opacity"
        style={{ opacity: selected ? 1 : 0 }}
      >
        <Check className="ll:size-3" />
      </span>
    </span>
    {option.description ? (
      <span className="ll:text-xs ll:leading-4 ll:text-muted-foreground">
        {option.description}
      </span>
    ) : null}
  </button>
);
