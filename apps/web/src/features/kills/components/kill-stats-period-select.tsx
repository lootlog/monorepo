import { PeriodSelector } from "@/components/filters/period-selector";

export type KillStatsPeriod = "all" | "24h" | "3d" | "7d" | "14d" | "30d";

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
      className={triggerClassName ?? "h-9"}
    />
  );
};
