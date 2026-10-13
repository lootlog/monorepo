import { Skeleton } from "@lootlog/ui/components/skeleton";
import type { FC } from "react";

const SKELETON_COUNT = 3;

const skeletonItems = Array.from({ length: SKELETON_COUNT }, (_, i) => i);

// Matches the loaded list: `pt-1` and a 54px pitch (44px icon, `mb-2`, `gap-0.5`).
export const GuildsSelectorSkeleton: FC = () => {
  return (
    <div className="flex flex-col items-center gap-2.5 px-[10px] pt-1">
      {skeletonItems.map((i) => (
        <Skeleton key={i} className="size-11 rounded-xl" />
      ))}
    </div>
  );
};
