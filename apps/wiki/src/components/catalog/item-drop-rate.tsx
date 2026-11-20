import type { CatalogDropSourceDtoOutput } from "@lootlog/client/catalog";
import { Button } from "@lootlog/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Info } from "lucide-react";
import { t } from "@/i18n/messages";
import {
  formatChance,
  FULL_PARTY_SIZE,
  getFullPartyChance,
  getRollChance,
} from "@/lib/drop-rate";
import { formatNumber } from "@lootlog/domain/locale";

/**
 * How likely a boss is to drop the item: the chance of one loot roll, and
 * for a boss that rolls per survivor, the chance of a full party's kill; for
 * a personal loot, the chance of each member who wears the item. An estimate
 * says so. Its button opens the drops, rolls and kills it is counted from and
 * the day counting began, so a reader can tell how much the chance rests on;
 * a boss Lootlog has too few kills of says so.
 */
export function ItemDropRate({
  rate,
  npcType,
}: {
  rate: CatalogDropSourceDtoOutput["dropRate"];
  npcType: string | null;
}) {
  if (!rate) {
    return (
      <span className="truncate text-xs text-muted-foreground">
        {t("catalog.dropRateUnknown")}
      </span>
    );
  }

  const roll = formatChance(getRollChance(rate));
  const party = getFullPartyChance(rate, npcType);

  const chance =
    rate.lootMode === "PERSONAL"
      ? t("catalog.dropRatePersonal", { rate: roll })
      : party === null
        ? t("catalog.dropRateSingle", { rate: roll })
        : t("catalog.dropRateShared", {
            rate: roll,
            party: formatChance(party),
            size: FULL_PARTY_SIZE,
          });

  const counts = [
    ["drops", rate.drops],
    ["rolls", Math.round(rate.rolls)],
    ["kills", rate.kills],
  ] as const;

  return (
    <span className="flex min-w-0 items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
      <span className="truncate">
        {rate.basis === "LOOTS"
          ? t("catalog.dropRateEstimate", { chance })
          : chance}
      </span>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t("catalog.dropRateCounts.open")}
              className="-my-1 shrink-0"
            >
              <Info aria-hidden="true" className="size-3.5" />
            </Button>
          }
        />
        <PopoverContent align="start" className="w-auto min-w-48 p-3">
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-xs tabular-nums">
            {counts.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-muted-foreground">
                  {t(`catalog.dropRateCounts.${key}`)}
                </dt>
                <dd className="text-right font-medium text-foreground">
                  {formatNumber(value)}
                </dd>
              </div>
            ))}
            <div className="contents">
              <dt className="text-muted-foreground">
                {t("catalog.dropRateCounts.since")}
              </dt>
              <dd className="text-right font-medium text-foreground">
                {t("catalog.dropRatesSinceDay")}
              </dd>
            </div>
          </dl>
        </PopoverContent>
      </Popover>
    </span>
  );
}
