import type { ReactNode } from "react";
import { formatNumber } from "@/lib/format-number";

type StatsDetailMetaProps = {
  subtitle?: ReactNode;
  /** `capped` marks a value that stops at a list's size: at least this many. */
  metrics: { key: string; label: string; value: number; capped?: boolean }[];
};

/** What a member's or monster's stats page is about, with its totals, for its `DetailBar`. */
export const StatsDetailMeta = ({
  subtitle,
  metrics,
}: StatsDetailMetaProps) => (
  <>
    {subtitle && (
      <span className="text-xs leading-tight text-muted-foreground">
        {subtitle}
      </span>
    )}
    {metrics.length > 0 && (
      <dl className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-tight">
        {metrics.map((metric) => (
          <div key={metric.key} className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">{metric.label}</dt>
            <dd className="font-semibold tabular-nums">
              {formatNumber(metric.value)}
              {metric.capped && "+"}
            </dd>
          </div>
        ))}
      </dl>
    )}
  </>
);
