import { EmptyState } from "@/components/common/empty-state";
import { SearchX } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

type StatsTableResultsProps = {
  isLoading: boolean;
  /** What the loaded rows hold, so the loading rows take their height. */
  rowContent?: ComponentProps<typeof TableRowsSkeleton>["rowContent"];
  /** Shown instead of the rows when the list is empty. */
  emptyMessage?: string;
  /** The loading placeholder for pages that list tiles instead of the table below `xl`. */
  mobileSkeleton?: ReactNode;
  children: ReactNode;
};

/** The rows of a stats table in a `ResultsSurface`, or their loading or empty state. */
export const StatsTableResults = ({
  isLoading,
  rowContent,
  emptyMessage,
  mobileSkeleton,
  children,
}: StatsTableResultsProps) => {
  if (isLoading) {
    return (
      <div aria-busy="true">
        <TableRowsSkeleton
          withHeader
          rowContent={rowContent}
          mobileList={mobileSkeleton}
        />
      </div>
    );
  }

  if (emptyMessage) {
    return (
      <div className="p-3">
        <EmptyState fill icon={SearchX} title={emptyMessage} />
      </div>
    );
  }

  return children;
};
