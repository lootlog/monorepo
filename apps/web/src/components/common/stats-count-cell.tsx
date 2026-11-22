import { cn } from "cn";
import { formatNumber } from "@lootlog/domain/locale";

type StatsCountCellProps = {
  value: number;
  emphasized?: boolean;
};

export const StatsCountCell = ({
  value,
  emphasized = false,
}: StatsCountCellProps) => (
  <span
    className={cn(
      "block text-right tabular-nums",
      emphasized && "font-semibold",
      value === 0 && "text-muted-foreground/50",
    )}
  >
    {formatNumber(value)}
  </span>
);
