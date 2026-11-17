import { PeriodSelector } from "@/components/filters/period-selector";
import {
  KILL_STATS_PERIODS,
  type KillStatsPeriod,
} from "@/features/kills/kill-stats-period";

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
      options={KILL_STATS_PERIODS}
      value={value}
      onValueChange={onValueChange}
      allLabel={allLabel}
      width={className ?? "w-[140px]"}
      className={triggerClassName}
      active={value !== "all"}
    />
  );
};
