import {
  LIST_TILE_GRID_CELL_CLASS,
  LIST_TILE_GRID_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type { ViewMode } from "@/hooks/use-view-mode";
import { cn } from "cn";

export const RESERVATIONS_VIEW_MODE_KEY = "reservations-view-mode";

/** Tailwind `lg`, where the spot grid gets its second column. */
export const RESERVATIONS_GRID_MEDIA_QUERY = "(min-width: 64rem)";

/** Spot tiles and skeleton tiles share the collection and cell classes. */
export const getReservationCollectionClassName = (viewMode: ViewMode) =>
  viewMode === "grid"
    ? cn(LIST_TILE_GRID_CLASS, "lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4")
    : "flex flex-col";

export const getReservationCellClassName = (viewMode: ViewMode) =>
  viewMode === "grid" ? LIST_TILE_GRID_CELL_CLASS : LIST_TILE_RULE_CLASS;

/** List rows put the status beside the name from `sm` up. */
export const RESERVATION_LIST_ROW_CLASS =
  "sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(14rem,1fr)] sm:items-center";
