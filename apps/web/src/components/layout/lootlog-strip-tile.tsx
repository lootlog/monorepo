import type { ReactNode } from "react";
import { cn } from "cn";

export const LOOTLOG_STRIP_TILE_CLASS =
  "flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-lg pt-1 pb-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring";

type LootlogStripTileProps = {
  children: ReactNode;
  label: string;
  isActive?: boolean;
};

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
        "max-w-full truncate text-2xs leading-tight",
        isActive
          ? "font-semibold text-foreground"
          : "font-medium text-muted-foreground",
      )}
    >
      {label}
    </span>
  </>
);
