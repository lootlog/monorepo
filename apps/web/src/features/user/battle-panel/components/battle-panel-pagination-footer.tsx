import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@lootlog/ui/components/pagination";
import { getPaginationDisplayRange } from "./battle-panel-filter-state";

type BattlePanelPaginationFooterProps = {
  hasNext: boolean;
  hasPrev: boolean;
  label: (range: { from: number; to: number; total: number }) => string;
  onNextPage: () => void;
  onPreviousPage: () => void;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  visibleCount: number;
};

export const BattlePanelPaginationFooter = ({
  hasNext,
  hasPrev,
  label,
  onNextPage,
  onPreviousPage,
  pageIndex,
  pageSize,
  totalCount,
  visibleCount,
}: BattlePanelPaginationFooterProps) => {
  const { from, to } = getPaginationDisplayRange({
    pageIndex,
    pageSize,
    totalCount,
    visibleCount,
  });

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-t border-border px-4 py-4">
      <div className="whitespace-nowrap text-sm text-muted-foreground">
        {label({ from, to, total: totalCount })}
      </div>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={onPreviousPage}
              className={
                !hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"
              }
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              onClick={onNextPage}
              className={
                !hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
