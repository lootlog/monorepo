import { SectionCard } from "@/components/common/section-card/section-card";
import type { ReactNode } from "react";

type StatsDetailHeaderProps = {
  media: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  metrics: { key: string; label: string; value: number }[];
};

const numberFormatter = new Intl.NumberFormat("pl-PL");

export const StatsDetailHeader = ({
  media,
  title,
  subtitle,
  metrics,
}: StatsDetailHeaderProps) => (
  <SectionCard className="shrink-0">
    <header className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 p-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {media}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {metrics.length > 0 && (
        <dl className="flex min-w-0 flex-wrap gap-x-6 gap-y-2">
          {metrics.map((metric) => (
            <div key={metric.key} className="flex flex-col">
              <dt className="text-xs text-muted-foreground">{metric.label}</dt>
              <dd className="text-lg font-semibold leading-6 tabular-nums">
                {numberFormatter.format(metric.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  </SectionCard>
);
