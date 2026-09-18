import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { StatsRank } from "./stats-rank";

type StatsLeaderboardRowProps = {
  rank: number;
  media?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value: number;
  /** The leader's value; the row's bar is drawn relative to it. */
  maxValue: number;
  link?: LinkProps;
};

const numberFormatter = new Intl.NumberFormat("pl-PL");

export const StatsLeaderboardRow = ({
  rank,
  media,
  title,
  subtitle,
  value,
  maxValue,
  link,
}: StatsLeaderboardRowProps) => {
  const share = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0;

  const content = (
    <>
      <span
        className="absolute inset-y-0 left-0 rounded-lg bg-primary/10"
        style={{ width: `${share}%` }}
        aria-hidden="true"
      />
      <span className="relative flex min-w-0 flex-1 items-center gap-3">
        <StatsRank rank={rank} />
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
    </>
  );

  const className =
    "relative flex min-h-12 min-w-0 items-center overflow-hidden rounded-lg px-2 py-1.5";

  return (
    <li>
      {link ? (
        <Link
          {...link}
          className={`${className} outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring`}
        >
          {content}
        </Link>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
};
