import { ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsPickerCardProps = {
  value: string;
  /** Accessible name, also shown as the native tooltip for truncated titles. */
  label: string;
  /** Decorative visual on the left, e.g. an avatar or a sprite. */
  leading: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Trailing indicator, e.g. a check mark on multi-choice pickers. */
  trailing?: ReactNode;
  className?: string;
};

/**
 * Grid cell of a settings picker: a toggle styled as a card with a visual,
 * a title and an optional subtitle. Selected cards are tinted and outlined
 * with the primary colour; unselected ones are dimmed a little so the chosen
 * ones read at a glance. Style `trailing` with `group-data-pressed/picker-card`
 * to reveal it only on selected cards.
 */
export const SettingsPickerCard: FC<SettingsPickerCardProps> = ({
  value,
  label,
  leading,
  title,
  subtitle,
  trailing,
  className,
}) => (
  <ToggleGroupItem
    value={value}
    aria-label={label}
    title={label}
    className={cn(
      "ll-custom-cursor-pointer ll:group/picker-card ll:h-auto ll:min-w-0 ll:justify-start ll:gap-2 ll:rounded-sm ll:border-0 ll:bg-black/25 ll:p-1.5 ll:pr-2 ll:text-left ll:font-normal",
      "ll:transition-[background-color,box-shadow,opacity] ll:hover:bg-white/5",
      "ll:data-pressed:bg-primary/15 ll:data-pressed:hover:bg-primary/20 ll:data-pressed:shadow-[inset_0_0_0_1px_var(--color-primary)]",
      "ll:not-disabled:not-data-pressed:opacity-70 ll:not-disabled:not-data-pressed:hover:opacity-100 ll:not-disabled:not-data-pressed:focus-visible:opacity-100",
      "ll:focus-visible:ring-0 ll:focus-visible:outline-2 ll:focus-visible:outline-offset-2 ll:focus-visible:outline-ring",
      "ll:disabled:opacity-60",
      className,
    )}
  >
    {leading}
    <span className="ll:flex ll:min-w-0 ll:flex-1 ll:flex-col">
      <span className="ll:truncate ll:text-[13px] ll:font-semibold ll:leading-[18px] ll:text-foreground">
        {title}
      </span>
      {subtitle ? (
        <span className="ll:truncate ll:text-xs ll:leading-4 ll:text-muted-foreground">
          {subtitle}
        </span>
      ) : null}
    </span>
    {trailing}
  </ToggleGroupItem>
);

/** Grid that wraps picker cards to the available width. */
export const settingsPickerGridClassName =
  "ll:grid ll:w-full ll:grid-cols-[repeat(auto-fill,minmax(min(100%,10.5rem),1fr))] ll:gap-1.5";
