import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import type { ReactNode } from "react";

type StatsChartCardProps = {
  title: string;
  description?: string;
  isLoading?: boolean;
  /** Shown instead of the chart when there is nothing to plot. */
  emptyMessage?: string;
  className?: string;
  children: ReactNode;
};

export const StatsChartCard = ({
  title,
  description,
  isLoading = false,
  emptyMessage,
  className,
  children,
}: StatsChartCardProps) => (
  <SectionCard
    aria-busy={isLoading}
    className={cn("flex min-w-0 flex-col", className)}
  >
    <SectionCardHeader title={title} description={description} />
    <SectionCardContent className="flex min-h-[280px] min-w-0 flex-1 flex-col">
      {isLoading ? (
        <Skeleton className="w-full flex-1 rounded-lg" />
      ) : emptyMessage ? (
        <p className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        children
      )}
    </SectionCardContent>
  </SectionCard>
);
