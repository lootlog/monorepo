import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@lootlog/ui/components/pagination";

type TablePaginationFooterProps = {
  totalLabel: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export const TablePaginationFooter = ({
  totalLabel,
  hasPrev,
  hasNext,
  onPreviousPage,
  onNextPage,
}: TablePaginationFooterProps) => {
  return (
    <div className="h-14 shrink-0 border-t border-border py-4 flex items-center justify-between px-4">
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {totalLabel}
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
