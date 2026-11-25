import {
  LIST_TILE_GRID_CELL_CLASS,
  LIST_TILE_GRID_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@lootlog/ui/lib/list-tile";
import type { ViewMode } from "@/hooks/use-view-mode";
import { cn } from "cn";

export const RESERVATIONS_VIEW_MODE_KEY = "reservations-view-mode";

export const RESERVATIONS_GRID_MEDIA_QUERY = "(min-width: 64rem)";

export const getReservationCollectionClassName = (viewMode: ViewMode) =>
  viewMode === "grid"
    ? cn(LIST_TILE_GRID_CLASS, "lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4")
    : "flex flex-col";

export const getReservationCellClassName = (viewMode: ViewMode) =>
  viewMode === "grid" ? LIST_TILE_GRID_CELL_CLASS : LIST_TILE_RULE_CLASS;

export const RESERVATION_LIST_ROW_CLASS =
  "flex min-h-14 items-center gap-3 py-2.5";
