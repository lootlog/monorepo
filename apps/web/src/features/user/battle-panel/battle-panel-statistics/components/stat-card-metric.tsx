import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

type StatCardMetricProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  valueClassName?: string;
};

export const StatCardMetric = ({
  icon: Icon,
  label,
  value,
  valueClassName,
}: StatCardMetricProps) => {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 text-center">
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Icon
          className={cn("size-3.5 shrink-0", valueClassName)}
          aria-hidden="true"
        />
        <span>{label}</span>
      </div>
      <span
        className={cn("text-xl font-semibold tabular-nums", valueClassName)}
      >
        {value}
      </span>
    </div>
  );
};
