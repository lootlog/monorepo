import { useState } from "react";
import { cn } from "cn";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

type EquipmentStatRowProps = {
  label: string;
  /** Drawn after the value, such as `%`. */
  unit: string;
  /** The set's total; absent when no worn item has the stat. */
  total: number | undefined;
  /** The total with the previewed item worn; null without a preview. */
  previewTotal: number | undefined | null;
};

// Attack speed keeps its hundredths; the other stats are whole points.
const format = (value: number) =>
  value.toLocaleString("pl-PL", { maximumFractionDigits: 2 });

const signed = (value: number, unit: string) =>
  `${value > 0 ? "+" : "−"}${format(Math.abs(value))}${unit}`;

/**
 * One summed stat as the game's character window draws it: its name and its
 * value. A preview glides the value to the total with the item worn and
 * slides in the change; a stat only the preview has opens its row, so the
 * list grows and shrinks instead of jumping.
 */
export function EquipmentStatRow({
  label,
  unit,
  total,
  previewTotal,
}: EquipmentStatRowProps) {
  const isPreviewing = previewTotal !== null;

  const target = isPreviewing ? (previewTotal ?? 0) : (total ?? 0);
  const change = isPreviewing ? target - (total ?? 0) : 0;

  const isVisible =
    total !== undefined || (isPreviewing && previewTotal !== undefined);

  const value = useAnimatedNumber(target);

  // The change stays readable while it fades out.
  const [shownChange, setShownChange] = useState(change);

  if (change !== 0 && change !== shownChange) setShownChange(change);

  // The animation passes through fractions; whole-point stats stay whole.
  const shownValue = Number.isInteger(target)
    ? Math.round(value)
    : Math.round(value * 100) / 100;

  return (
    <div
      aria-hidden={!isVisible}
      inert={!isVisible}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
        isVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "-mx-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-sm px-1.5 py-[3px] text-[0.8125rem] transition-colors duration-200 motion-reduce:transition-none",
            change > 0 && "bg-signal-ready/8",
            change < 0 && "bg-destructive/10",
          )}
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="flex items-baseline justify-end gap-1.5 text-right">
            <span
              aria-hidden={change === 0}
              className={cn(
                "text-xs font-semibold tabular-nums transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none",
                change === 0 ? "translate-x-1 opacity-0" : "translate-x-0",
                shownChange > 0 ? "text-signal-ready" : "text-destructive",
              )}
            >
              {shownChange === 0 ? null : signed(shownChange, unit)}
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              {format(shownValue)}
              {unit}
            </span>
          </dd>
        </div>
      </div>
    </div>
  );
}
