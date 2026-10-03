import type { ReactNode } from "react";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type SkeletonSectionCardProps = {
  children: ReactNode;
  className?: string;
};

/** A section card whose header and content are still loading. */
export const SkeletonSectionCard = ({
  children,
  className,
}: SkeletonSectionCardProps) => (
  <SectionCard className={className}>
    <div className="flex min-h-12 items-center gap-2 border-b border-border/70 px-3 py-2">
      <Skeleton className="size-5 shrink-0 rounded-md" />
      <Skeleton className="h-4 w-32" />
    </div>
    {children}
  </SectionCard>
);
