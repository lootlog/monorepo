import { EmptyState } from "@/components/common/empty-state";
import { SectionCard } from "@/components/common/section-card/section-card";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { StatsRankingRowsSkeleton } from "./stats-ranking-rows-skeleton";

type StatsTableCardProps = {
  isLoading: boolean;
  /** Shown instead of the rows when the list is empty. */
  emptyMessage?: string;
  footer?: ReactNode;
  children: ReactNode;
};

/** Fills the rest of the page and scrolls its rows inside, so filters and pagination stay in view. */
export const StatsTableCard = ({
  isLoading,
  emptyMessage,
  footer,
  children,
}: StatsTableCardProps) => (
  <SectionCard
    aria-busy={isLoading}
    className="flex min-h-0 flex-1 flex-col overflow-hidden"
  >
    <ScrollArea className="relative min-h-0 flex-1">
      {isLoading ? (
        <StatsRankingRowsSkeleton />
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
