import type { LucideIcon } from "lucide-react";

type KillStatsRecordProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
};

/** One record: a row on phones and next to the heatmap, a column on tablets. */
export const KillStatsRecord = ({
  icon: Icon,
  label,
  value,
  detail,
}: KillStatsRecordProps) => (
  <div className="flex min-w-0 items-center gap-3 p-4 sm:flex-col sm:items-start xl:flex-row xl:items-center">
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
      <Icon className="size-5 text-primary" aria-hidden="true" />
    </div>
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="truncate text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-2xl font-semibold leading-7 tabular-nums">
        {value}
      </div>
      <div className="truncate text-xs text-muted-foreground">{detail}</div>
    </div>
  </div>
);
