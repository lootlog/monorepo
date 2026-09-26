import { Check } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

export type ChecklistMenuItem<Value extends string> = {
  value: Value;
  label: string;
  leading?: ReactNode;
};

type ChecklistMenuOnlyAction<Value extends string> = {
  getLabel: (itemLabel: string) => string;
  onSelect: (value: Value) => void;
  text: string;
};

type ChecklistMenuProps<Value extends string> = {
  "aria-label": string;
  className?: string;
  items: readonly ChecklistMenuItem<Value>[];
  onToggle: (value: Value) => void;
  /** Adds an "only" button to each row (and on right-click) that keeps just that entry. */
  only?: ChecklistMenuOnlyAction<Value>;
  selected: ReadonlySet<Value>;
};

const ROW_SELECTOR = "[data-ll-checklist-row]";

const ICON_SIZE = 12;

/**
 * Popover checklist shared by filters and pickers: each row toggles its entry,
 * and the optional "only" button (or a right-click on the row) keeps just that
 * entry. Up and Down move between rows so the list works without a pointer.
 */
export const ChecklistMenu = <Value extends string>({
  "aria-label": ariaLabel,
  className,
  items,
  only,
  onToggle,
  selected,
}: ChecklistMenuProps<Value>) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const rows = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(ROW_SELECTOR),
    );

    if (rows.length === 0) return;
    event.preventDefault();

    const currentIndex = rows.findIndex((row) =>
      row.contains(document.activeElement),
    );

    const step = event.key === "ArrowDown" ? 1 : -1;

    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + step + rows.length) % rows.length;

    rows[nextIndex]
      ?.querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: false });
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("ll:flex ll:flex-col", className)}
      onKeyDown={handleKeyDown}
    >
      {items.map((item) => {
        const isSelected = selected.has(item.value);

        return (
          <div
            key={item.value}
            data-ll-checklist-row=""
            className="ll:flex ll:items-stretch"
          >
            <Button
              size="xs"
              variant="menu"
              aria-pressed={isSelected}
              className={cn(
                "ll:min-w-0 ll:flex-1 ll:justify-between ll:gap-2",
                !isSelected && "ll:text-muted-foreground",
              )}
              onClick={() => onToggle(item.value)}
              onContextMenu={
                only
                  ? (event) => {
                      event.preventDefault();
                      only.onSelect(item.value);
                    }
                  : undefined
              }
            >
              <span className="ll:flex ll:min-w-0 ll:items-center ll:gap-1.5">
                {item.leading}
                <span className="ll:truncate">{item.label}</span>
              </span>
              {isSelected ? (
                <Check
                  size={ICON_SIZE}
                  aria-hidden="true"
                  className="ll:shrink-0"
                />
              ) : null}
            </Button>
            {only ? (
              <Button
                size="xs"
                variant="menu"
                aria-label={only.getLabel(item.label)}
                className="ll:shrink-0 ll:px-2 ll:text-[11px] ll:font-medium ll:text-muted-foreground ll:hover:text-foreground"
                onClick={() => only.onSelect(item.value)}
              >
                {only.text}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
