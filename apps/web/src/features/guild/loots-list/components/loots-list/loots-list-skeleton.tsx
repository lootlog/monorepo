import type { ViewMode } from "@/hooks/use-view-mode";
import { cn } from "cn";
import {
  LOOTS_GRID_CELL_CLASS,
  LOOTS_GRID_CLASS,
} from "../../loots-list-layout";
import { LootsListItemSkeleton } from "./loots-list-item-skeleton";

const SKELETON_TILE_COUNT = 8;

type Props = {
  viewMode: ViewMode;
  className?: string;
};

/** Loading placeholder tiled exactly like the loaded list. */
export const LootsListSkeleton = ({ viewMode, className }: Props) => (
  <div
    role="status"
    aria-busy="true"
    className={cn(
      viewMode === "grid" ? LOOTS_GRID_CLASS : "flex flex-col",
      className,
    )}
  >
    {Array.from({ length: SKELETON_TILE_COUNT }, (_, index) => (
      <div
        key={index}
        data-list-tile
        className={viewMode === "grid" ? LOOTS_GRID_CELL_CLASS : undefined}
      >
        <LootsListItemSkeleton index={index} />
      </div>
    ))}
  </div>
);
