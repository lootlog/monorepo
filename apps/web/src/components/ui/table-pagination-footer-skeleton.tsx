import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { TablePaginationFooter } from "./table-pagination-footer";

const noop = () => undefined;

export const TablePaginationFooterSkeleton = ({
  labelClassName = "w-24",
}: {
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
