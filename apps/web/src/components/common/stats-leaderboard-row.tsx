import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { RankBadge } from "@/components/common/rank-badge";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { VIEWER_ROW_CLASS } from "@/components/common/viewer-row";
import { cn } from "cn";

type StatsLeaderboardRowProps = {
  rank: number;
  media?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value: number;
  link?: LinkProps;
  /** Marks the viewer's own place. */
  isViewer?: boolean;
};

const numberFormatter = new Intl.NumberFormat("pl-PL");

export const StatsLeaderboardRow = ({
  rank,
  media,
  title,
  subtitle,
  value,
  link,
  isViewer = false,
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
        {numberFormatter.format(value)}
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
      className={LIST_TILE_RULE_CLASS}
    >
      {link ? (
        <Link
          {...link}
          className={cn(
            className,
            "outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
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
