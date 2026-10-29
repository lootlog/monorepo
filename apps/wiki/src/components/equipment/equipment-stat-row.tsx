import { useState } from "react";
import { cn } from "cn";
import { renderItemStat } from "@/components/render-item-stat";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import type { SummedStatKey } from "@/lib/item-stat-totals";

type EquipmentStatRowProps = {
  statKey: SummedStatKey;
  /** The set's total; absent when no worn item has the stat. */
  total: number | undefined;
  /** The total with the previewed item worn; null without a preview. */
  previewTotal: number | undefined | null;
};

const signed = (value: number) =>
  `${value > 0 ? "+" : "−"}${Math.abs(Math.round(value)).toLocaleString("pl-PL")}`;

/**
 * One summed stat. A preview glides the value to the total with the item
 * worn and slides in the change; a stat only the preview has opens its row,
 * so the list grows and shrinks instead of jumping.
 */
export function EquipmentStatRow({
  statKey,
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

  return (
    <li
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
            "-mx-1.5 flex items-baseline justify-between gap-2 rounded-sm px-1.5 py-0.5 transition-colors duration-200 motion-reduce:transition-none",
            change > 0 && "bg-signal-ready/8",
            change < 0 && "bg-destructive/10",
          )}
        >
          <span className="min-w-0 truncate tabular-nums">
            {renderItemStat({ key: statKey, value: String(Math.round(value)) })}
          </span>
          <span
            aria-hidden={change === 0}
            className={cn(
              "shrink-0 font-semibold tabular-nums transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none",
              change === 0 ? "translate-x-1 opacity-0" : "translate-x-0",
              shownChange > 0 ? "text-signal-ready" : "text-destructive",
            )}
          >
            {shownChange === 0 ? null : signed(shownChange)}
          </span>
        </div>
      </div>
    </li>
  );
}
