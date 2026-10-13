import { Skeleton } from "@lootlog/ui/components/skeleton";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import type { ReactNode } from "react";
import { SkeletonLine } from "../skeleton-line";
import { SectionCard } from "./section-card";

type SectionCardSkeletonProps = {
  /** Reserves the icon of a `SectionCardHeader` loaded with `icon`. */
  withIcon?: boolean;
  withDescription?: boolean;
  /** The loading body; a chart-sized block when omitted. */
  children?: ReactNode;
  className?: string;
};

/**
 * A titled section card whose content is still loading. Its header is a real
 * `SectionCardHeader` with line placeholders, so it is exactly as tall as the
 * loaded one.
 */
export const SectionCardSkeleton = ({
  withIcon = false,
  withDescription = true,
  children,
  className,
}: SectionCardSkeletonProps) => (
  <SectionCard className={className}>
    <SectionCardHeader
      title={
        <span className="flex items-center gap-2">
          {withIcon && <Skeleton className="size-5 shrink-0 rounded-md" />}
          <SkeletonLine className="h-4 w-40" />
        </span>
      }
      description={
        withDescription ? (
          <span className={withIcon ? "block pl-7" : "block"}>
            <SkeletonLine className="h-3 w-56 max-w-full" />
          </span>
        ) : undefined
      }
    />
    {children ?? (
      <div className="p-3">
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )}
  </SectionCard>
);
