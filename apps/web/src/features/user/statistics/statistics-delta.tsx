import { cn } from "cn";
import { TrendingDown, TrendingUp } from "lucide-react";

const deltaFormatter = new Intl.NumberFormat("pl-PL", {
  signDisplay: "exceptZero",
});

const percentFormatter = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});

type StatisticsDeltaProps = {
  delta: number;
  /** Null when the previous period had no kills to compare with. */
  percent: number | null;
  className?: string;
};

/** The change on the previous period, with its direction as an icon. */
export function StatisticsDelta({
  delta,
  percent,
  className,
}: StatisticsDeltaProps) {
  const Icon = delta < 0 ? TrendingDown : TrendingUp;

  return (
    <span
      className={cn(
        "flex items-center gap-1 tabular-nums",
        delta === 0 ? "text-muted-foreground/50" : "text-muted-foreground",
        className,
      )}
    >
      {delta !== 0 && <Icon className="size-3.5 shrink-0" aria-hidden />}
      {deltaFormatter.format(delta)}
      {percent !== null && delta !== 0 && (
        <span>({percentFormatter.format(percent / 100)})</span>
      )}
    </span>
  );
}
