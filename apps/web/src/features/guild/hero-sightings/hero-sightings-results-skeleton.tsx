import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import {
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_GRID_CELL_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@/components/common/list-tile";
import { HERO_SIGHTINGS_GRID_CLASS } from "./hero-sightings-board";

const SKELETON_TILES = 6;

/** Stands in for the board: a group heading above `HeroSightingTile`s. */
export const HeroSightingsResultsSkeleton = () => (
  <div aria-busy="true">
    <div className={cn(LIST_GROUP_HEADING_CLASS, LIST_TILE_INSET_CLASS)}>
      <Skeleton className="h-3 w-20" />
    </div>
    <div className="overflow-hidden">
      <div className={HERO_SIGHTINGS_GRID_CLASS}>
        {Array.from({ length: SKELETON_TILES }, (_, index) => (
          <div
            key={index}
            data-list-tile
            className={cn(
              LIST_TILE_GRID_CELL_CLASS,
              LIST_TILE_INSET_CLASS,
              "flex flex-col gap-3 py-4",
            )}
          >
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex h-5 items-center">
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex h-4 items-center">
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex h-5 items-center">
                <Skeleton className="h-3.5 w-2/3" />
              </div>
              <div className="flex h-4 items-center">
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 border-t border-sidebar-border pt-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              {[0, 1].map((fact) => (
                <div key={fact} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-16" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-7 shrink-0 rounded-full" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
