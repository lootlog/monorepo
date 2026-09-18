import { TableRow } from "@lootlog/ui/components/table";
import { cn } from "cn";
import type { ComponentProps } from "react";

export const StatsTableRow = ({
  className,
  onClick,
  ...props
}: ComponentProps<typeof TableRow>) => (
  <TableRow
    className={cn(
      "h-14 border-b border-border hover:bg-muted/50",
      onClick && "cursor-pointer",
      className,
    )}
    onClick={onClick}
    {...props}
  />
);
