import type { SortDirection } from "@tanstack/react-table";
import { cn } from "cn";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";

type SortableColumn = {
  getIsSorted: () => false | SortDirection;
  toggleSorting: (desc?: boolean) => void;
};

type SortableColumnHeaderProps = {
  column: SortableColumn;
  children: ReactNode;
  align?: "start" | "center" | "end";
  /** Narrow tables can drop the neutral icon so only the sorted column spends width on one. */
  showUnsortedIcon?: boolean;
  className?: string;
};

const JUSTIFY_BY_ALIGN = {
  start: "justify-start text-left",
  center: "justify-center text-center",
  end: "justify-end text-right",
} as const;

/**
 * The header button of a sortable TanStack column. The table header sets the
 * matching `aria-sort` on the surrounding cell.
 */
export const SortableColumnHeader = ({
  column,
  children,
  align = "center",
  showUnsortedIcon = true,
  className,
}: SortableColumnHeaderProps) => {
  const sortDirection = column.getIsSorted();

  const handleClick = () => {
    // An unsorted column starts in its natural direction; a sorted one flips
    // and never drops back to unsorted, so the header always shows the order.
    column.toggleSorting(sortDirection ? sortDirection === "asc" : undefined);
  };

  let icon: ReactNode = null;

  if (sortDirection === "asc") {
    icon = <ArrowUp className="size-3 shrink-0" aria-hidden />;
  } else if (sortDirection === "desc") {
    icon = <ArrowDown className="size-3 shrink-0" aria-hidden />;
  } else if (showUnsortedIcon) {
    icon = <ArrowUpDown className="size-3 shrink-0 opacity-50" aria-hidden />;
  }

  return (
    <button
      type="button"
      className={cn(
        "flex w-full cursor-pointer select-none items-center gap-1 rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        sortDirection && "text-foreground",
        JUSTIFY_BY_ALIGN[align],
        className,
      )}
      onClick={handleClick}
    >
      {children}
      {icon}
    </button>
  );
};
