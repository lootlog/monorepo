import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import type { ReactNode } from "react";
import { LEADERBOARD_SIZE } from "../constants";

type StatsLeaderboardCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  isLoading?: boolean;
  /** Shown instead of the rows when there is nothing to rank. */
  emptyMessage?: string;
  className?: string;
  children: ReactNode;
};

export const StatsLeaderboardCard = ({
  title,
  description,
  actions,
  isLoading = false,
  emptyMessage,
  className,
  children,
}: StatsLeaderboardCardProps) => (
  <SectionCard
    aria-busy={isLoading}
    className={cn("flex min-w-0 flex-col", className)}
  >
    <SectionCardHeader
      title={title}
      description={description}
      actions={actions}
    />
    <SectionCardContent className="flex min-w-0 flex-1 flex-col p-2">
      {isLoading ? (
        <div className="flex flex-col gap-1">
          {Array.from({ length: LEADERBOARD_SIZE }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : emptyMessage ? (
        <p className="flex min-h-40 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ol className="flex flex-col gap-1">{children}</ol>
      )}
    </SectionCardContent>
  </SectionCard>
);
