import { cn } from "cn";
import { useStatChange } from "@/hooks/use-stat-change";

const format = (value: number) =>
  value.toLocaleString("pl-PL", { maximumFractionDigits: 2 });

type EquipmentKeyStatProps = {
  label: string;
  /** Drawn after the value, such as `%`. */
  unit: string;
  total: number;
  /** Whether the set has loaded, so a new total is the User's change. */
  isLoaded: boolean;
};

/** One of the dock's stats, gliding to a new total with its change beside it. */
export function EquipmentKeyStat({
  label,
  unit,
  total,
  isLoaded,
}: EquipmentKeyStatProps) {
  const { value, change } = useStatChange(total, isLoaded);

  return (
    <div className="flex shrink-0 flex-col leading-tight whitespace-nowrap">
      <dt className="text-[0.6875rem] text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-1.5 text-sm font-semibold text-foreground tabular-nums">
        {format(value)}
        {unit}
        {change === 0 ? null : (
          <span
            className={cn(
              "text-xs transition-[opacity,translate] duration-200 ease-out starting:translate-x-1 starting:opacity-0 motion-reduce:transition-none",
              change > 0 ? "text-signal-ready" : "text-destructive",
            )}
          >
            {change > 0 ? "+" : "−"}
            {format(Math.abs(change))}
            {unit}
          </span>
        )}
      </dd>
    </div>
  );
}
