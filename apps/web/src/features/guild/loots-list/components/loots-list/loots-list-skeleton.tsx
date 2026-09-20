import type { ViewMode } from "@/hooks/use-view-mode";
import { cn } from "cn";
import { LOOTS_GRID_CLASS } from "../../loots-list-layout";
import { LootsListItemSkeleton } from "./loots-list-item-skeleton";

const SKELETON_CARD_COUNT = 8;

type Props = {
  viewMode: ViewMode;
  className?: string;
};

/** Loading placeholder with the same inset and gap as the loaded list. */
export const LootsListSkeleton = ({ viewMode, className }: Props) => (
  <div
    role="status"
    aria-busy="true"
    className={cn(
      "px-3 pb-3",
      viewMode === "grid" ? LOOTS_GRID_CLASS : "flex flex-col gap-3",
      className,
    )}
  >
    {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
      <LootsListItemSkeleton key={index} index={index} />
    ))}
  </div>
);
