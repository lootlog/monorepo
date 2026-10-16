import { BandSection } from "@/components/common/band-section";
import { EmptyState } from "@/components/common/empty-state";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { Inbox } from "lucide-react";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { useId, type ReactNode } from "react";

/** Rows of a full leaderboard, so paired leaderboards stay the same height. */
export const LEADERBOARD_SIZE = 10;

type StatsLeaderboardSectionProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  isLoading?: boolean;
  /** Shown instead of the rows when there is nothing to rank. */
  emptyMessage?: string;
  /** How many rows stand in while it loads. */
  loadingRows?: number;
  children: ReactNode;
};

/** A leaderboard under a banded heading, its rows tiled edge to edge. */
export const StatsLeaderboardSection = ({
  title,
  description,
  actions,
  isLoading = false,
  emptyMessage,
  loadingRows = LEADERBOARD_SIZE,
  children,
}: StatsLeaderboardSectionProps) => (
  <BandSection
    id={useId()}
    title={title}
    description={description}
    trailing={actions}
    tiled
  >
    {isLoading ? (
      <div aria-busy="true">
        {Array.from({ length: loadingRows }, (_, index) => (
          <div
            key={index}
            className={cn(
              "flex h-[49px] items-center",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
    ) : emptyMessage ? (
      <EmptyState
        icon={Inbox}
        title={emptyMessage}
        compact
        className="min-h-40"
      />
    ) : (
      <ol>{children}</ol>
    )}
  </BandSection>
);
