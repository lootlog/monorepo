import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import type { ReactNode } from "react";

type SkeletonPageHeaderProps = {
  children?: ReactNode;
};

/** A `PageHeader` whose title and context are still loading. */
export const SkeletonPageHeader = ({ children }: SkeletonPageHeaderProps) => (
  <PageHeader
    title=<Skeleton render={<span />} className="block h-5 w-40" />
    description=<Skeleton
      render={<span />}
      className="block h-3 w-56 max-w-full"
    />
    metadata=<Skeleton render={<span />} className="block h-3 w-32" />
  >
    {children}
  </PageHeader>
);
