import { cn } from "cn";
import { ItemStatLine } from "@lootlog/ui/components/item-stat-line";
import { t } from "@/i18n/messages";
import type { StatChange } from "@/lib/stat-changes";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";
import { EmptyNotice } from "@/components/common/empty-notice";

const percent = new Intl.NumberFormat(PRODUCT_LOCALE, {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function ItemUpgradeChanges({
  changes,
}: {
  changes: ReadonlyArray<StatChange>;
}) {
  if (changes.length === 0) {
    return <EmptyNotice>{t("upgrade.noChanges")}</EmptyNotice>;
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
              <ItemStatLine displayValue={displayValue} />
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
