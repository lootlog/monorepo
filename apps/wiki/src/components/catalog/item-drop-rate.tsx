import type { CatalogDropSourceDtoOutput } from "@lootlog/client/search";
import { t } from "@/i18n/messages";
import { formatDropRate } from "@/lib/drop-rate";

/**
 * How often a boss's kills drop the item, with the kills it is counted
 * from; a boss Lootlog has too few kills of says so.
 */
export function ItemDropRate({
  rate,
}: {
  rate: CatalogDropSourceDtoOutput["dropRate"];
}) {
  return (
    <span className="truncate text-xs text-muted-foreground tabular-nums">
      {rate
        ? t("catalog.dropRate", {
            rate: formatDropRate(rate),
            drops: rate.drops.toLocaleString("pl-PL"),
            kills: rate.kills.toLocaleString("pl-PL"),
          })
        : t("catalog.dropRateUnknown")}
    </span>
  );
}
