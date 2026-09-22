/** Layout state shared by the loots page and its route-level skeleton. */
export const LOOTS_FILTERS_OPEN_KEY = "loots-filters-open";

export const LOOTS_VIEW_MODE_KEY = "loots-view-mode";

/** Below this width the filters open as an overlay instead of a side panel. */
export const LOOTS_COMPACT_FILTERS_BREAKPOINT = 1100;

/** Cards, skeleton cards and sentinel rows share this side padding and gap. */
export const LOOTS_LIST_ROW_GAP_CLASS = "pb-3";

export const LOOTS_LIST_INSET_CLASS = "inset-x-3";

export const LOOTS_GRID_CLASS = "grid grid-cols-1 gap-3 xl:grid-cols-2";

/** Horizontal inset shared by every loot card section and the details dialog body. */
export const LOOT_CARD_INSET_CLASS = "px-4 sm:px-5";

export const LOOT_CARD_DIVIDER_CLASS = "border-t border-border/40";

/** Legendary drops share one accent with the legendary item frame. */
export const LEGENDARY_LOOT_CARD_CLASS =
  "border-orange-500/60 shadow-[0_0_14px_rgba(234,88,12,0.18)] hover:border-orange-500/80 hover:shadow-[0_0_18px_rgba(234,88,12,0.28)]";

export const LEGENDARY_LOOT_ROW_CLASS = "bg-orange-500/[0.05]";
