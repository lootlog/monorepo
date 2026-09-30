import { Skeleton } from "@lootlog/ui/components/skeleton";
import { SectionCard } from "./section-card";

type SectionCardSkeletonProps = {
  className?: string;
};

/** A titled section card whose content is still loading. */
export const SectionCardSkeleton = ({
  className,
}: SectionCardSkeletonProps) => (
  <SectionCard className={className}>
    <div className="flex min-h-12 flex-col justify-center gap-1.5 border-b border-border/70 px-3 py-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-56 max-w-full" />
    </div>
    <div className="p-3">
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  </SectionCard>
);
