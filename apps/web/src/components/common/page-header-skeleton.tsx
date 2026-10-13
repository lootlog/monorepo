import { Skeleton } from "@lootlog/ui/components/skeleton";
import type { ReactNode } from "react";
import { PageHeader } from "./page-header";
import { SkeletonLine } from "./skeleton-line";

type PageHeaderSkeletonProps = {
  /** Reserves the icon tile of a header loaded with `icon`. */
  withIcon?: boolean;
  /** Placeholder for the loaded header's media, such as an NPC tile. */
  media?: ReactNode;
  withDescription?: boolean;
  withMetadata?: boolean;
  /** Placeholder for the loaded header's status, such as an NPC tile. */
  status?: ReactNode;
  /** Placeholders for the loaded header's actions. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** A `PageHeader` whose title and context are still loading. */
export const PageHeaderSkeleton = ({
  withIcon = true,
  media,
  withDescription = true,
  withMetadata = false,
  status,
  actions,
  children,
  className,
}: PageHeaderSkeletonProps) => (
  <PageHeader
    className={className}
    media={
      media ??
      (withIcon ? (
        <Skeleton className="size-9 shrink-0 rounded-lg" />
      ) : undefined)
    }
    title=<SkeletonLine className="h-5 w-40" />
    description={
      withDescription ? (
        <SkeletonLine className="h-3 w-56 max-w-full" />
      ) : undefined
    }
    metadata={withMetadata ? <SkeletonLine className="h-3 w-32" /> : undefined}
    status={status}
    actions={actions}
  >
    {children}
  </PageHeader>
);
