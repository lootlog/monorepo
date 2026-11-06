import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { RankBadge } from "@/components/common/rank-badge";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
  LIST_TILE_HOVER_CLASS,
} from "@/components/common/list-tile";
import { VIEWER_ROW_CLASS } from "@/components/common/viewer-row";
import { cn } from "cn";
import { formatNumber } from "@/lib/format-number";

type StatsLeaderboardRowProps = {
  rank: number;
  media?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value: number;
  /** Writes the value, such as event points with their unit. */
  formatValue?: (value: number) => string;
  link?: LinkProps;
  /** Marks the viewer's own place. */
  isViewer?: boolean;
  /** Sticks to the bottom of its scroller while its place is below the view. */
  pinned?: boolean;
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
}: StatsLeaderboardRowProps) => {
  const content = (
    <span className="flex min-w-0 flex-1 items-center gap-3">
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
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {formatValue(value)}
      </span>
    </span>
  );

  const className = cn(
    "flex min-h-12 min-w-0 items-center py-1.5",
    LIST_TILE_INSET_CLASS,
  );

  return (
    <li
      data-list-tile
      aria-current={isViewer || undefined}
      className={cn(
        LIST_TILE_RULE_CLASS,
        pinned && "sticky bottom-0 z-10 bg-background",
      )}
    >
      {link ? (
        <Link
          {...link}
          className={cn(
            className,
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            LIST_TILE_HOVER_CLASS,
            isViewer && VIEWER_ROW_CLASS,
          )}
        >
          {content}
        </Link>
      ) : (
        <div className={cn(className, isViewer && VIEWER_ROW_CLASS)}>
          {content}
        </div>
      )}
    </li>
  );
};
