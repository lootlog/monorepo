import { Skeleton } from "@lootlog/ui/components/skeleton";
import type { FC } from "react";

const SKELETON_COUNT = 3;

const skeletonItems = Array.from({ length: SKELETON_COUNT }, (_, i) => i);

// Matches the loaded list: `pt-1` and a 54px pitch (44px icon, `mb-2`, `gap-0.5`).
export const GuildsSelectorSkeleton: FC<{
  orientation?: "vertical" | "horizontal";
}> = ({ orientation = "vertical" }) => {
  // The strip's tiles: a 44px avatar over a label, 72px apart.
  if (orientation === "horizontal") {
    return (
      <div className="flex gap-1">
        {skeletonItems.map((i) => (
          <div
            key={i}
            className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 pt-1 pb-0.5"
          >
            <Skeleton className="size-11 rounded-lg" />
            <Skeleton className="h-3.5 w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2.5 px-[10px] pt-1">
      {skeletonItems.map((i) => (
        <Skeleton key={i} className="size-11 rounded-lg" />
      ))}
    </div>
  );
};
