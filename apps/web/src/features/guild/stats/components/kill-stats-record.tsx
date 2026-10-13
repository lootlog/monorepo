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
  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 p-3 sm:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto]">
    <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </div>
    <div className="col-start-2 row-span-2 row-start-1 text-xl font-semibold tabular-nums sm:col-start-1 sm:row-span-1 sm:row-start-2 sm:text-2xl xl:col-start-2 xl:row-span-2 xl:row-start-1">
      {value}
    </div>
    <div className="truncate text-xs text-muted-foreground">{detail}</div>
  </div>
);
