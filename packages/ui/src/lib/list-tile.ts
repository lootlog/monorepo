import { cn } from "cn";

export const LIST_TILE_INSET_CLASS = "px-3 sm:px-4";

export const LIST_GROUP_HEADING_CLASS =
  "flex h-9 items-center gap-2 border-b border-sidebar-border text-xs font-semibold text-muted-foreground";

export const LIST_BAND_HEADING_CLASS =
  "glass-bar -mt-px h-10 border-y border-border text-[13px] text-foreground [--glass-bar-tint:color-mix(in_oklab,var(--muted)_45%,var(--background))]";

export const LIST_TILE_RULE_CLASS = "isolate border-b border-sidebar-border";

export const LIST_TILE_GRID_CLASS = "-mr-px grid grid-cols-1";

export const LIST_TILE_GRID_CELL_CLASS = `${LIST_TILE_RULE_CLASS} lg:border-r`;

export const LIST_TILE_HOVER_CLASS =
  "transition-colors hover:bg-muted/40 motion-reduce:transition-none";

export const getListTileLinkClassName = (hasActions: boolean) =>
  cn(
    "flex min-w-0 flex-1 items-center gap-3 self-stretch py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    LIST_TILE_INSET_CLASS,
    hasActions && "pr-1 sm:pr-1",
  );

export const LIST_TILE_ACTIONS_CLASS =
  "flex shrink-0 items-center gap-1 pr-3 sm:pr-4";
