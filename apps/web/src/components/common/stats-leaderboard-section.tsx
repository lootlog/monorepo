import { BandSection } from "@/components/common/band-section";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { Inbox } from "lucide-react";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { useId, type ReactNode } from "react";

export const LEADERBOARD_SIZE = 10;

type StatsLeaderboardSectionProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  loadingRows?: number;
  children: ReactNode;
};

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
