import { cn } from "cn";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";

type StatisticsDistributionProps = {
  title: string;
  rows: { label: string; kills: number }[];
};

export function StatisticsDistribution({
  title,
  rows,
}: StatisticsDistributionProps) {
  const maximum = Math.max(1, ...rows.map((row) => row.kills));
  return (
    <SectionCard>
      <SectionCardHeader title={title} description="Europe/Warsaw" />
      <SectionCardContent>
        <dl
          aria-label={title}
          className={cn(
            "grid gap-x-6 gap-y-3",
            rows.length > 12 && "grid-cols-2",
          )}
        >
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <dt>{row.label}</dt>
                <dd className="font-semibold tabular-nums">
                  {row.kills.toLocaleString("pl-PL")}
                </dd>
              </div>
              <div
                aria-hidden
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(row.kills / maximum) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      </SectionCardContent>
    </SectionCard>
  );
}
