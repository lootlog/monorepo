/** Layout state shared by the loots page and its route-level skeleton. */
export const LOOTS_FILTERS_OPEN_KEY = "loots-filters-open";

export const LOOTS_VIEW_MODE_KEY = "loots-view-mode";

/** Below this width the filters open as an overlay instead of a side panel. */
export const LOOTS_COMPACT_FILTERS_BREAKPOINT = 1100;

/**
 * Loots tile the list edge to edge: no gaps, one hairline between
 * neighbours. Tiles and skeleton tiles share the grid and cell classes.
 */
export const LOOTS_GRID_CLASS = "grid grid-cols-1 xl:grid-cols-2";

export const LOOTS_GRID_CELL_CLASS =
  "h-full border-sidebar-border xl:odd:border-r";

export const LOOT_TILE_CLASS = "border-b border-sidebar-border";

/** Tailwind `xl`, where `LOOTS_GRID_CLASS` gets its second column. */
export const LOOTS_GRID_MEDIA_QUERY = "(min-width: 80rem)";

/** Horizontal inset shared by every loot tile section and the details dialog body. */
export const LOOT_CARD_INSET_CLASS = "px-3 sm:px-4";

/** Compact feed rows tint legendary drops; loot tiles carry `loot-legendary`. */
export const LEGENDARY_LOOT_ROW_CLASS = "bg-orange-600/[0.05]";
