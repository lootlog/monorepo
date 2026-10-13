import { EmptyState } from "@/components/common/empty-state";
import { SectionCard } from "@/components/common/section-card/section-card";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { SearchX } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

type StatsTableCardProps = {
  isLoading: boolean;
  /** What the loaded rows hold, so the loading rows take their height. */
  rowContent?: ComponentProps<typeof TableRowsSkeleton>["rowContent"];
  /** Shown instead of the rows when the list is empty. */
  emptyMessage?: string;
  footer?: ReactNode;
  /** The loading placeholder for pages that render a card list instead of the table below `md`. */
  mobileSkeleton?: ReactNode;
  children: ReactNode;
};

/** Fills the rest of the page and scrolls its rows inside, so filters and pagination stay in view. */
export const StatsTableCard = ({
  isLoading,
  rowContent,
  emptyMessage,
  footer,
  mobileSkeleton,
  children,
}: StatsTableCardProps) => (
  <SectionCard
    aria-busy={isLoading}
    className="flex min-h-0 flex-1 flex-col overflow-hidden"
  >
    <ScrollArea className="relative min-h-0 flex-1">
      {isLoading ? (
        <TableRowsSkeleton
          withHeader
          rowContent={rowContent}
          mobileList={mobileSkeleton}
        />
      ) : emptyMessage ? (
        <EmptyState icon={SearchX} title={emptyMessage} />
      ) : (
        children
      )}
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
    {footer}
  </SectionCard>
);
