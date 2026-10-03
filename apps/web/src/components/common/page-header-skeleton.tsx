import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import type { ReactNode } from "react";
import { PageHeader } from "./page-header";

type PageHeaderSkeletonProps = {
  /** Reserves the icon tile of a header loaded with `icon`. */
  withIcon?: boolean;
  withDescription?: boolean;
  withMetadata?: boolean;
  /** Placeholder for the loaded header's status, such as an NPC tile. */
  status?: ReactNode;
  /** Placeholders for the loaded header's actions. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * A line placeholder exactly one line box tall, so the loaded text takes the
 * same height.
 */
const renderLine = (className: string) => (
  <span className="flex h-lh items-center">
    <Skeleton render={<span />} className={cn("block", className)} />
  </span>
);

/** A `PageHeader` whose title and context are still loading. */
export const PageHeaderSkeleton = ({
  withIcon = true,
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
      withIcon ? <Skeleton className="size-9 shrink-0 rounded-lg" /> : undefined
    }
    title={renderLine("h-5 w-40")}
    description={
      withDescription ? renderLine("h-3 w-56 max-w-full") : undefined
    }
    metadata={withMetadata ? renderLine("h-3 w-32") : undefined}
    status={status}
    actions={actions}
  >
    {children}
  </PageHeader>
);
