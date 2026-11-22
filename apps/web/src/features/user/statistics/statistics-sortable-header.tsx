import type { ComponentProps } from "react";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";

type StatisticsSortableHeaderProps = {
  column: ComponentProps<typeof SortableColumnHeader>["column"];
  label: string;
};

export function StatisticsSortableHeader({
  column,
  label,
}: StatisticsSortableHeaderProps) {
  return (
    <SortableColumnHeader column={column} align="end">
      {label}
    </SortableColumnHeader>
  );
}
