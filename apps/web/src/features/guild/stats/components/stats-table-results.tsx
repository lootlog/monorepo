import { EmptyState } from "@/components/common/empty-state";
import { SearchX } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

type StatsTableResultsProps = {
  isLoading: boolean;
  rowContent?: ComponentProps<typeof TableRowsSkeleton>["rowContent"];
  emptyMessage?: string;
  mobileSkeleton?: ReactNode;
  children: ReactNode;
};

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
          rows={20}
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
