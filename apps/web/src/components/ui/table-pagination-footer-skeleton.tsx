import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { TablePaginationFooter } from "./table-pagination-footer";

const noop = () => undefined;

/** A `TablePaginationFooter` whose total is still loading. */
export const TablePaginationFooterSkeleton = ({
  labelClassName = "w-24",
}: {
  /** The width of the loading total. */
  labelClassName?: string;
}) => (
  <TablePaginationFooter
    totalLabel={<Skeleton className={cn("h-4", labelClassName)} />}
    hasPrev={false}
    hasNext={false}
    onPreviousPage={noop}
    onNextPage={noop}
  />
);
