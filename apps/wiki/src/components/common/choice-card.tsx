import type { ReactNode } from "react";
import { cn } from "cn";

type ChoiceCardProps = {
  /** The radio group the card belongs to. */
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  className?: string;
  children: ReactNode;
};

/**
 * One option of a radio group drawn as a card, lit in the item's rarity
 * color while chosen; the radio itself stays for keyboards and screen
 * readers.
 */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  className,
  children,
}: ChoiceCardProps) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col gap-2 rounded-lg border p-3 transition-[background-color,border-color,box-shadow] duration-200 has-focus-visible:ring-2 has-focus-visible:ring-ring motion-reduce:transition-none",
        checked
          ? "border-(--item-rarity) bg-[color-mix(in_oklab,var(--item-rarity)_12%,var(--card))] shadow-[0_0_24px_-8px_color-mix(in_oklab,var(--item-rarity)_60%,transparent)]"
          : "border-border bg-card hover:border-[color-mix(in_oklab,var(--item-rarity)_50%,var(--border))]",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {children}
    </label>
  );
}
