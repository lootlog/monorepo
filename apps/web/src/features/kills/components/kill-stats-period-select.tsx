import { PeriodSelector } from "@/components/filters/period-selector";
import type { KillStatsPeriod } from "@/features/kills/kill-stats-period";

type KillStatsPeriodSelectProps = {
  value: KillStatsPeriod;
  onValueChange: (value: KillStatsPeriod) => void;
  allLabel?: string;
  className?: string;
  triggerClassName?: string;
};

export const KillStatsPeriodSelect: React.FC<KillStatsPeriodSelectProps> = ({
  value,
  onValueChange,
  allLabel,
  className,
  triggerClassName,
}) => {
  return (
    <PeriodSelector
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue !== "90d" && nextValue !== "180d")
          onValueChange(nextValue);
      }}
      excludePeriods={["90d", "180d"]}
      allLabel={allLabel}
      width={className ?? "w-[140px]"}
      className={triggerClassName}
      active={value !== "all"}
    />
  );
};
