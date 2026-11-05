import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type StatsTileGridProps = {
  /** The grid's column counts, such as `sm:grid-cols-2 xl:grid-cols-4`. */
  className?: string;
  children: ReactNode;
};

/**
 * Statistics tiles edge to edge, one hairline between neighbours. Each tile
 * rules its right and bottom edge, and the grid overhangs its clipping
 * wrapper by a pixel so the last column's rule disappears.
 */
export const StatsTileGrid = ({ className, children }: StatsTileGridProps) => (
  <div className="overflow-hidden">
    <div className={cn("-mr-px grid grid-cols-1", className)}>{children}</div>
  </div>
);

/** The rules of one cell in a `StatsTileGrid`. */
export const STATS_TILE_CELL_CLASS =
  "min-w-0 border-r border-b border-sidebar-border";

type StatsTileProps = {
  /** Omit, with `media`, for a tile too narrow for one. */
  icon?: LucideIcon;
  /** Stands in for the icon, such as a monster's sprite. */
  media?: ReactNode;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

/**
 * One statistic in a `StatsTileGrid`: the icon beside the value when the tile
 * has room for both, above it in a narrow tile, whatever the viewport.
 */
export const StatsTile = ({
  icon: Icon,
  media,
  label,
  value,
  detail,
}: StatsTileProps) => (
  <div className={cn("@container", STATS_TILE_CELL_CLASS)}>
    <div className="flex h-full flex-col items-start gap-3 p-4 @[16rem]:flex-row @[16rem]:items-center">
      {media ??
        (Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-5 text-primary" aria-hidden="true" />
          </div>
        ))}
      <div className="flex min-w-0 max-w-full flex-col gap-0.5">
        <div className="truncate text-xs font-medium text-muted-foreground">
          {label}
        </div>
        {/* A name, such as the week's monster, wraps instead of losing its end. */}
        <div className="line-clamp-2 text-2xl leading-7 font-semibold break-words tabular-nums">
          {value}
        </div>
        <div className="min-h-4 truncate text-xs text-muted-foreground">
          {detail}
        </div>
      </div>
    </div>
  </div>
);
