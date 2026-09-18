import { SectionCard } from "@/components/common/section-card/section-card";
import { TableFilterToolbar } from "@/components/ui/table-filter-toolbar";
import type { ReactNode } from "react";

type FilterBarProps = {
  ariaLabel: string;
  children: ReactNode;
};

export const FilterBar = ({ ariaLabel, children }: FilterBarProps) => {
  return (
    <SectionCard className="shrink-0 overflow-hidden">
      <TableFilterToolbar
        role="group"
        aria-label={ariaLabel}
        className="border-b-0"
      >
        {children}
      </TableFilterToolbar>
    </SectionCard>
  );
};
