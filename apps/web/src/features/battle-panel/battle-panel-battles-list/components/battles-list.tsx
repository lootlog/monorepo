import {
  useBattles,
  UseBattlesParams,
} from "@/hooks/api/battle-log/use-battles";
import { BattlesListEntry } from "@/features/battle-panel/battle-panel-battles-list/components/battles-list-entry";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@lootlog/ui/components/pagination";
import { useRef, useEffect } from "react";
import {
  BattlesListFilters,
  type BattleFilters,
} from "./battles-list-filters";

type BattlesListProps = {
  params?: UseBattlesParams;
  onPageChange?: (page: number) => void;
  onFiltersChange?: (filters: BattleFilters) => void;
  showPagination?: boolean;
  showFilters?: boolean;
};

export const BattlesList = ({
  params,
  onPageChange,
  onFiltersChange,
  showPagination = false,
  showFilters = false,
}: BattlesListProps) => {
  const { data: battlesResponse } = useBattles(params);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && params?.page) {
      containerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [params?.page]);

  const currentFilters: BattleFilters = {
    world: params?.world,
    type: params?.type,
    search: params?.search,
  };

  const handlePageClick = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  const renderPaginationItems = () => {
    if (!battlesResponse?.pagination) return null;

    const { page, totalPages } = battlesResponse.pagination;
    const items = [];

    // Always show first page
    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          onClick={() => handlePageClick(1)}
          isActive={page === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    // Show ellipsis if needed
    if (page > 3) {
      items.push(<PaginationEllipsis key="ellipsis-start" />);
    }

    // Show pages around current page
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageClick(i)}
            isActive={page === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Show ellipsis if needed
    if (page < totalPages - 2) {
      items.push(<PaginationEllipsis key="ellipsis-end" />);
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => handlePageClick(totalPages)}
            isActive={page === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div ref={containerRef} className="flex flex-col min-h-full">
      {showFilters && onFiltersChange && (
        <BattlesListFilters
          filters={currentFilters}
          onFiltersChange={onFiltersChange}
        />
      )}

      <div className="flex-1">
        {battlesResponse?.battles.map((battle) => (
          <BattlesListEntry key={battle.id} battle={battle} />
        ))}
      </div>

      {showPagination &&
        battlesResponse?.pagination &&
        battlesResponse.pagination.totalPages > 1 && (
          <div className="sticky bottom-0 mt-auto bg-background border-t h-16 flex items-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      battlesResponse.pagination.hasPrev &&
                      handlePageClick(battlesResponse.pagination.page - 1)
                    }
                    className={
                      !battlesResponse.pagination.hasPrev
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {renderPaginationItems()}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      battlesResponse.pagination.hasNext &&
                      handlePageClick(battlesResponse.pagination.page + 1)
                    }
                    className={
                      !battlesResponse.pagination.hasNext
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
    </div>
  );
};
