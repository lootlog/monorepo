import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import type { ReactNode } from "react";

export const NotificationsTabSkeleton = ({
  actions,
  children,
}: {
  actions: ReactNode;
  children: ReactNode;
}) => (
  <div aria-busy="true">
    <FilterBar search={<InlineSearchFieldSkeleton />}>
      <div className="flex items-center gap-2">{actions}</div>
    </FilterBar>
    {children}
  </div>
);
