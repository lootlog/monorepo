import { Check, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";

type FilterTileProps = {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  /** Drawn before the label, in the tile's own color. */
  icon?: ReactNode;
  /** Recolors the tile, such as a rarity's frame once pressed. */
  className?: string;
  /** Why the option cannot be picked yet; shown instead of the check. */
  lockedLabel?: string;
  /** The label in the middle, without a check, for tiles laid out in a grid. */
  centered?: boolean;
};

/** One option of a filter: a tile that is pressed while it filters. */
export function FilterTile({
  label,
  pressed,
  onPressedChange,
  icon,
  className,
  lockedLabel,
  centered = false,
}: FilterTileProps) {
  const isLocked = lockedLabel !== undefined;

  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={isLocked}
      title={isLocked ? `${label} · ${lockedLabel}` : label}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "group/tile flex h-8 w-full min-w-0 items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2 text-left text-xs font-medium text-muted-foreground outline-none transition-[color,background-color,border-color,box-shadow] duration-150 hover:border-border hover:bg-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        "aria-pressed:border-primary/60 aria-pressed:bg-primary/12 aria-pressed:text-foreground",
        centered && "justify-center gap-1 px-1 text-center tabular-nums",
        "disabled:cursor-not-allowed disabled:border-dashed disabled:bg-transparent disabled:text-muted-foreground/60 disabled:hover:border-border/50",
        className,
      )}
    >
      {icon ? (
        <span className="flex size-4 shrink-0 items-center justify-center group-disabled/tile:opacity-50">
          {icon}
        </span>
      ) : null}
      <span className={cn("min-w-0 truncate", !centered && "flex-1")}>
        {label}
      </span>
      {centered ? null : isLocked ? (
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-normal">
          <Lock aria-hidden="true" className="size-3" />
          {lockedLabel}
        </span>
      ) : (
        <Check
          aria-hidden="true"
          className="size-3.5 shrink-0 scale-50 opacity-0 transition-[opacity,scale] duration-150 ease-out group-aria-pressed/tile:scale-100 group-aria-pressed/tile:opacity-100 motion-reduce:transition-none"
        />
      )}
    </button>
  );
}
