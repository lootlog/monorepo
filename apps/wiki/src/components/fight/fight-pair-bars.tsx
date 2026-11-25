import { cn } from "cn";
import { FIGHT_SIDES } from "./fight-sides";
import type { FightStatRow } from "./fight-stat-rows";

const leads = (own: number, other: number, better: FightStatRow["better"]) => {
  if (better === undefined) return false;

  return better === "higher" ? own > other : own < other;
};

const barWidth = (row: FightStatRow, value: number) =>
  row.scale === "share"
    ? value * 100
    : (value / Math.max(...row.values, Number.EPSILON)) * 100;

export function FightPairBars({ rows }: { rows: readonly FightStatRow[] }) {
  return (
    <dl className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.id} className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          {FIGHT_SIDES.map((side, index) => {
            const value = row.values[index] ?? 0;
            const other = row.values[1 - index] ?? 0;

            return (
              <dd key={side.fill} className="flex items-center gap-2">
                <span className="h-1.5 min-w-0 flex-1 rounded-full bg-muted">
                  <span
                    className={cn("block h-full rounded-full", side.fill)}
                    style={{ width: `${barWidth(row, value)}%` }}
                  />
                </span>
                <span
                  className={cn(
                    "w-16 shrink-0 text-right text-[0.8125rem] tabular-nums",
                    leads(value, other, row.better)
                      ? cn("font-semibold", side.text)
                      : "text-foreground/80",
                  )}
                >
                  {row.format(value)}
                </span>
              </dd>
            );
          })}
        </div>
      ))}
    </dl>
  );
}
