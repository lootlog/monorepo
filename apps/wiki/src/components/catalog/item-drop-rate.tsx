import type { CatalogDropSourceDtoOutput } from "@lootlog/client/catalog";
import { t } from "@/i18n/messages";
import {
  formatChance,
  FULL_PARTY_SIZE,
  getFullPartyChance,
  getRollChance,
} from "@/lib/drop-rate";

/**
 * How likely a boss is to drop the item: the chance of one loot roll, and
 * for a boss that rolls per survivor, the chance of a full party's kill; for
 * a personal loot, the chance of each member who wears the item. An estimate
 * says so. The counts behind it show on hover; a boss Lootlog has too few
 * kills of says so.
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

  return (
    <span
      className="truncate text-xs text-muted-foreground tabular-nums"
      title={t("catalog.dropRateCounts", {
        drops: rate.drops.toLocaleString("pl-PL"),
        rolls: Math.round(rate.rolls).toLocaleString("pl-PL"),
        kills: rate.kills.toLocaleString("pl-PL"),
      })}
    >
      {rate.basis === "LOOTS"
        ? t("catalog.dropRateEstimate", { chance })
        : chance}
    </span>
  );
}
