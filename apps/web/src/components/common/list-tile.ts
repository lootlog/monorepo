import { cn } from "cn";

/**
 * Lists such as loots, timers and reservations tile the page edge to edge:
 * no gaps or radius, one hairline between neighbours. Tiles, their group
 * headings, the list toolbar and skeleton tiles share these classes; a tile
 * carries `data-list-tile` so it stays readable over a theme's wallpaper.
 */

/** Horizontal inset of every tile, heading and toolbar in a tiled list. */
export const LIST_TILE_INSET_CLASS = "px-3 sm:px-4";

/**
 * The hairline under each tile. A tile is isolated, so nothing raised inside
 * it, such as a focused row or stacked sprites, paints over the list toolbar
 * that the tiles scroll under.
 */
export const LIST_TILE_RULE_CLASS = "isolate border-b border-sidebar-border";

/**
 * A grid of tiles inside an `overflow-hidden` wrapper. Each cell rules its
 * right edge once the grid has columns, and the grid overhangs the wrapper by
 * a pixel so the last column's rule disappears. Add the column counts.
 */
export const LIST_TILE_GRID_CLASS = "-mr-px grid grid-cols-1";

export const LIST_TILE_GRID_CELL_CLASS = `${LIST_TILE_RULE_CLASS} lg:border-r`;

/**
 * A tile split into a link and trailing actions, such as pin or delete. The
 * link fills the tile's height and takes its inset; with actions after it,
 * they take the right inset instead.
 */
export const getListTileLinkClassName = (hasActions: boolean) =>
  cn(
    "flex min-w-0 flex-1 items-center gap-3 self-stretch py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    LIST_TILE_INSET_CLASS,
    hasActions && "pr-1 sm:pr-1",
  );

export const LIST_TILE_ACTIONS_CLASS =
  "flex shrink-0 items-center gap-1 pr-3 sm:pr-4";
