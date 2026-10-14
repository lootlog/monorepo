import type { ReactNode } from "react";

type StatsDetailMetaProps = {
  subtitle?: ReactNode;
  metrics: { key: string; label: string; value: number }[];
};

const numberFormatter = new Intl.NumberFormat("pl-PL");

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
              {numberFormatter.format(metric.value)}
            </dd>
          </div>
        ))}
      </dl>
    )}
  </>
);
