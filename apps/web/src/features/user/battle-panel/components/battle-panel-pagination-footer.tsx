import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
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
    <TablePaginationFooter
      totalLabel={label({ from, to, total: totalCount })}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onPreviousPage={onPreviousPage}
      onNextPage={onNextPage}
    />
  );
};
