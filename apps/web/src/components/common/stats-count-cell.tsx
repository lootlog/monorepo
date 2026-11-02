import { cn } from "cn";
import { formatNumber } from "@/lib/format-number";

type StatsCountCellProps = {
  value: number;
  emphasized?: boolean;
};

/** Zeros are dimmed so the columns that matter stand out in a wide ranking. */
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
