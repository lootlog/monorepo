import {
  LIST_TILE_GRID_CELL_CLASS,
  LIST_TILE_GRID_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type { ViewMode } from "@/hooks/use-view-mode";
import { cn } from "cn";

export const RESERVATIONS_VIEW_MODE_KEY = "reservations-view-mode";

/**
 * Tailwind `lg`, where the spot grid gets its second column. Below it the page
 * keeps the one-column grid, whose tiles also show the spot's NPC images.
 */
export const RESERVATIONS_GRID_MEDIA_QUERY = "(min-width: 64rem)";

/** Spot tiles and skeleton tiles share the collection and cell classes. */
export const getReservationCollectionClassName = (viewMode: ViewMode) =>
  viewMode === "grid"
    ? cn(LIST_TILE_GRID_CLASS, "lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4")
    : "flex flex-col";

export const getReservationCellClassName = (viewMode: ViewMode) =>
  viewMode === "grid" ? LIST_TILE_GRID_CELL_CLASS : LIST_TILE_RULE_CLASS;

/** A list row: the spot, its status, then its actions, on one line. */
export const RESERVATION_LIST_ROW_CLASS =
  "grid min-h-14 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-6 py-2";
