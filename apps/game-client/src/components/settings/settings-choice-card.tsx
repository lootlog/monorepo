import { Check } from "lucide-react";
import type { FC, ReactNode } from "react";

export type SettingsChoiceOption<Value extends string> = {
  value: Value;
  title: ReactNode;
  description?: ReactNode;
  /** Shown in place but not selectable, so the grid keeps its layout. */
  disabled?: boolean;
};

type SettingsChoiceCardProps<Value extends string> = {
  option: SettingsChoiceOption<Value>;
  selected: boolean;
  disabled: boolean;
  tabIndex: number;
  onSelect: () => void;
};

export const SettingsChoiceCard: FC<SettingsChoiceCardProps<string>> = ({
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
