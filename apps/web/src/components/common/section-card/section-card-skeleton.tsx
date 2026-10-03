import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import type { ReactNode } from "react";
import { SectionCard } from "./section-card";

type SectionCardSkeletonProps = {
  /** Reserves the icon of a `SectionCardHeader` loaded with `icon`. */
  withIcon?: boolean;
  withDescription?: boolean;
  /** The loading body; a chart-sized block when omitted. */
  children?: ReactNode;
  className?: string;
};

/** A titled section card whose content is still loading. */
export const SectionCardSkeleton = ({
  withIcon = false,
  withDescription = true,
  children,
  className,
}: SectionCardSkeletonProps) => (
  <SectionCard className={className}>
    <div className="flex min-h-12 flex-col justify-center gap-1.5 border-b border-border/70 px-3 py-2">
      <div className="flex items-center gap-2">
        {withIcon && <Skeleton className="size-5 shrink-0 rounded-md" />}
        <Skeleton className={cn("h-4", withIcon ? "w-32" : "w-40")} />
      </div>
      {withDescription && (
        <Skeleton className={cn("h-3 w-56 max-w-full", withIcon && "ml-7")} />
      )}
    </div>
    {children ?? (
      <div className="p-3">
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )}
  </SectionCard>
);
