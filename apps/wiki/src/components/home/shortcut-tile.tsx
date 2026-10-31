import { Link } from "@tanstack/react-router";
import { ChevronRight, Lock, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import type { ItemsSearch } from "@/lib/items-search";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

type ShortcutTileProps = {
  icon: LucideIcon;
  label: string;
  description?: string;
  /** The filters the tile opens the item search with. */
  search: Partial<ItemsSearch>;
  /** Colors the icon and the label, such as a rarity's text color. */
  toneClassName: string;
  /** Why the tile leads nowhere yet; it then shows this instead of a link. */
  lockedLabel?: string;
};

const TILE =
  "group/shortcut flex h-full items-center gap-3 rounded-lg border border-border/50 bg-card p-3";

/** A home page tile that opens the item search with filters picked. */
export function ShortcutTile({
  icon: Icon,
  label,
  description,
  search,
  toneClassName,
  lockedLabel,
}: ShortcutTileProps) {
  if (lockedLabel !== undefined) {
    return (
      <div
        aria-disabled="true"
        className={cn(TILE, "border-dashed bg-transparent opacity-60")}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md bg-current/10",
            toneClassName,
          )}
        >
          <Icon aria-hidden="true" className="size-4.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-muted-foreground">
            {label}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {lockedLabel}
          </span>
        </span>
        <Lock
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </div>
    );
  }

  return (
    <Link
      to="/items"
      search={{ ...EMPTY_ITEMS_SEARCH, ...search }}
      className={cn(
        TILE,
        "outline-none transition-colors hover:border-border hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md bg-current/10 transition-[scale] duration-200 ease-out group-hover/shortcut:scale-110 motion-reduce:transition-none",
          toneClassName,
        )}
      >
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("truncate text-sm font-semibold", toneClassName)}>
          {label}
        </span>
        {description ? (
          <span className="truncate text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-[translate] duration-150 group-hover/shortcut:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}
