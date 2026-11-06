import type { ReactNode } from "react";
import { cn } from "cn";

/** The tap target around a tile: the link or button of the entry. */
export const LOOTLOG_STRIP_TILE_CLASS =
  "flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-lg pt-1 pb-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring";

type LootlogStripTileProps = {
  /** The 44px avatar or glyph, with any corner marks. */
  children: ReactNode;
  label: string;
  isActive?: boolean;
};

/**
 * One entry of the phone sheet's Lootlog strip. Phones have no hover, so the
 * name the rail keeps in a tooltip sits under the avatar, as on a home screen.
 */
export const LootlogStripTile = ({
  children,
  label,
  isActive = false,
}: LootlogStripTileProps) => (
  <>
    <span
      className={cn(
        "relative flex size-11 items-center justify-center rounded-lg",
        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-sidebar",
      )}
    >
      {children}
    </span>
    <span
      className={cn(
        "max-w-full truncate text-[11px] leading-tight",
        isActive
          ? "font-semibold text-foreground"
          : "font-medium text-muted-foreground",
      )}
    >
      {label}
    </span>
  </>
);
