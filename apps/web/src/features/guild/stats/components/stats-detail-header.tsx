import { PageHeader } from "@/components/common/page-header";
import type { ReactNode } from "react";

type StatsDetailHeaderProps = {
  media: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  metrics: { key: string; label: string; value: number }[];
};

const numberFormatter = new Intl.NumberFormat("pl-PL");

/** The shared page header, with the subject's totals beside its title. */
export const StatsDetailHeader = ({
  media,
  title,
  subtitle,
  metrics,
}: StatsDetailHeaderProps) => (
  <PageHeader
    media={media}
    title={title}
    description={subtitle}
    actions={
      metrics.length > 0 && (
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
      )
    }
  />
);
