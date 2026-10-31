import { cn } from "cn";
import { renderItemStat } from "@/components/render-item-stat";
import { t } from "@/i18n/messages";
import type { StatChange } from "@/lib/stat-changes";

const percent = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

/**
 * The stats an upgrade changes, as the item shows them upgraded, each with
 * how much it grew; a share reads the same for points, hundredths and ranges.
 */
export function ItemUpgradeChanges({
  changes,
}: {
  changes: ReadonlyArray<StatChange>;
}) {
  if (changes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {t("upgrade.noChanges")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-card">
      {changes.map(({ displayValue, before, after }) => {
        const share = before === 0 ? null : (after - before) / Math.abs(before);

        return (
          <li
            key={displayValue.key}
            className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
          >
            <span className="min-w-0 text-pretty text-foreground/90">
              {renderItemStat(displayValue)}
            </span>
            {share === null ? null : (
              <span
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                  share > 0
                    ? "bg-emerald-500/12 text-emerald-400"
                    : "bg-destructive/12 text-destructive",
                )}
              >
                {percent.format(share)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
