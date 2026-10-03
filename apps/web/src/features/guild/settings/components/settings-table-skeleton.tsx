import { SectionCard } from "@/components/common/section-card/section-card";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { TableFilterToolbar } from "@/components/ui/table-filter-toolbar";
import { Skeleton } from "@lootlog/ui/components/skeleton";

/** Stands in for SettingsTableCard while the role or monster list loads. */
export const SettingsTableSkeleton = () => (
  <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-3 pb-3">
    <SectionCard className="min-h-0 flex-1 overflow-hidden">
      <TableFilterToolbar>
        <Skeleton className="h-10 w-full rounded-xl" />
      </TableFilterToolbar>
      <TableRowsSkeleton rows={8} trailingColumns={2} />
    </SectionCard>
  </div>
);
