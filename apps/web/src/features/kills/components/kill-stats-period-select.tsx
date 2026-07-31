import { PeriodSelector } from "@/components/filters/period-selector";

export type KillStatsPeriod = "all" | "24h" | "3d" | "7d" | "14d" | "30d";

type KillStatsPeriodSelectProps = {
  value: KillStatsPeriod;
  onValueChange: (value: KillStatsPeriod) => void;
  className?: string;
};

export const KillStatsPeriodSelect: React.FC<KillStatsPeriodSelectProps> = ({
  value,
  onValueChange,
  className,
}) => {
  return (
    <PeriodSelector
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as KillStatsPeriod)}
      excludePeriods={["90d", "180d"]}
      width={className ?? "w-[140px]"}
      className="h-9"
    />
  );
};
