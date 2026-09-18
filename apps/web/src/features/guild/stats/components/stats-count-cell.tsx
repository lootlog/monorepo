import { cn } from "cn";

const numberFormatter = new Intl.NumberFormat("pl-PL");

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
    {numberFormatter.format(value)}
  </span>
);
