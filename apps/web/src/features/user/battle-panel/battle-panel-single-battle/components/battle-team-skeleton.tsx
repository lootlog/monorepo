import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { BattleTeamMemberSkeleton } from "./battle-team-member-skeleton";

type BattleTeamSkeletonProps = {
  align: "start" | "end";
  className?: string;
};

/** Stands in for one team of `BattleTeamsOverview`. */
export const BattleTeamSkeleton = ({
  align,
  className,
}: BattleTeamSkeletonProps) => (
  <section
    className={cn(
      "flex min-w-0 flex-col gap-3 py-4",
      LIST_TILE_INSET_CLASS,
      className,
    )}
  >
    <div
      className={cn(
        "flex h-6 items-center gap-2",
        align === "end" && "@md:flex-row-reverse",
      )}
    >
      <SkeletonLine className="h-3 w-24" />
      <Skeleton className="h-6 w-20 rounded-md" />
    </div>
    <div className={cn("flex", align === "end" && "@md:justify-end")}>
      <BattleTeamMemberSkeleton />
    </div>
  </section>
);
