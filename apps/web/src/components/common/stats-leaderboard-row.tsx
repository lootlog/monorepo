import { Link, type LinkProps } from "@tanstack/react-router";
import * as m from "framer-motion/m";
import { useChangeCount } from "@lootlog/ui/hooks/use-change-count";
import { useId, type ReactNode } from "react";
import { RankBadge } from "@/components/common/rank-badge";
import { RankChangeIndicator } from "@/components/common/rank-change-indicator";
import { useRankChange } from "@/components/common/use-rank-change";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
  LIST_TILE_HOVER_CLASS,
} from "@lootlog/ui/lib/list-tile";
import { VIEWER_ROW_CLASS } from "@/components/common/viewer-row";
import { cn } from "cn";
import { formatNumber } from "@lootlog/domain/locale";

type StatsLeaderboardRowProps = {
  rank: number;
  media?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value: number;
  formatValue?: (value: number) => string;
  link?: LinkProps;
  isViewer?: boolean;
  pinned?: boolean;
  live?: boolean;
};

export const StatsLeaderboardRow = ({
  rank,
  media,
  title,
  subtitle,
  value,
  formatValue = formatNumber,
  link,
  isViewer = false,
  pinned = false,
  live = false,
}: StatsLeaderboardRowProps) => {
  const contentId = useId();
  const rankChange = useRankChange(rank);
  const valueChangeCount = useChangeCount(value);

  const content = (
    <span id={contentId} className="flex min-w-0 flex-1 items-center gap-3">
      <RankBadge rank={rank} />
      {media}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium leading-tight">
          {title}
        </span>
        {subtitle && (
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      {live && rankChange !== 0 && (
        <RankChangeIndicator key={rankChange} places={rankChange} />
      )}
      <span
        key={live ? valueChangeCount : undefined}
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          live &&
            valueChangeCount > 0 &&
            "-mx-1 animate-arrival rounded-sm px-1 motion-reduce:animate-none",
        )}
      >
        {formatValue(value)}
      </span>
    </span>
  );

  const className = cn(
    "flex min-h-12 min-w-0 items-center py-1.5",
    LIST_TILE_INSET_CLASS,
  );

  return (
    <m.li
      layout={live && !pinned ? "position" : undefined}
      initial={false}
      data-list-tile
      aria-current={isViewer || undefined}
      className={cn(
        LIST_TILE_RULE_CLASS,
        pinned && "sticky bottom-0 z-10 bg-background",
      )}
    >
      {link ? (
        <div
          className={cn(
            className,
            "relative",
            LIST_TILE_HOVER_CLASS,
            isViewer && VIEWER_ROW_CLASS,
          )}
        >
          <Link
            {...link}
            aria-labelledby={contentId}
            className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          />
          <span className="pointer-events-none relative flex min-w-0 flex-1">
            {content}
          </span>
        </div>
      ) : (
        <div className={cn(className, isViewer && VIEWER_ROW_CLASS)}>
          {content}
        </div>
      )}
    </m.li>
  );
};
