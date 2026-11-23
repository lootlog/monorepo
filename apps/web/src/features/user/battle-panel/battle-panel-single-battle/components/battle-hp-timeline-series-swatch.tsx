import { cn } from "cn";

type BattleHpTimelineSeriesSwatchProps = {
  color: string;
  isAverage: boolean;
  className?: string;
};

export function BattleHpTimelineSeriesSwatch({
  color,
  isAverage,
  className,
}: BattleHpTimelineSeriesSwatchProps) {
  if (isAverage) {
    return (
      <span
        aria-hidden="true"
        className={cn("w-3 shrink-0 border-t-2 border-dashed", className)}
        style={{ borderColor: color }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn("size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}
