import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { SearchX, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useMediaQuery } from "usehooks-ts";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

type StatsTableEmptyState =
  | { isFiltered: false; icon: LucideIcon; title: string }
  | {
      isFiltered: true;
      title: string;
      description: string;
      onClearFilters: () => void;
    };

type StatsTableResultsProps = {
  isLoading: boolean;
  rowContent?: ComponentProps<typeof TableRowsSkeleton>["rowContent"];
  emptyState?: StatsTableEmptyState;
  mobileSkeleton?: ReactNode;
  tiles: ReactNode;
  children: ReactNode;
};

export const StatsTableResults = ({
  isLoading,
  rowContent,
  emptyState,
  mobileSkeleton,
  tiles,
  children,
}: StatsTableResultsProps) => {
  const usesTable = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);

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

  if (emptyState) {
    return (
      <div className="p-3">
        {emptyState.isFiltered ? (
          <EmptyState
            fill
            icon={SearchX}
            title={emptyState.title}
            description={emptyState.description}
            action={<ClearFiltersButton onClear={emptyState.onClearFilters} />}
          />
        ) : (
          <EmptyState fill icon={emptyState.icon} title={emptyState.title} />
        )}
      </div>
    );
  }

  return usesTable ? children : tiles;
};
