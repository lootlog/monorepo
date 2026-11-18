import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import { resolveItemRarity } from "@lootlog/domain/item-rarity";
import { ItemTileDetails } from "@lootlog/ui/components/item-tile-details";
import type { ItemDisplayValue } from "@lootlog/ui/components/item-stat-utils";
import type { ReactNode } from "react";
import { t } from "@/i18n/messages";
import { ITEM_TILE_LABELS } from "@/lib/item-options";

type ItemPageTooltipProps = {
  /** The item as the page shows it, at its level for the set's character. */
  item: CatalogItemDtoOutput;
  /** Its stats at the upgrade the page shows. */
  stat: string;
  upgradeLevel: number;
  renderStat: (displayValue: ItemDisplayValue) => ReactNode;
};

/**
 * The item's in-game tooltip as the page's side panel, framed in its rarity.
 * It says what the item is, who wears it and from which level.
 */
export function ItemPageTooltip({
  item,
  stat,
  upgradeLevel,
  renderStat,
}: ItemPageTooltipProps) {
  return (
    <aside
      aria-label={t("item.inGame")}
      className="relative overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--item-rarity)_40%,var(--border))] bg-popover"
    >
      <ItemTileDetails
        color=""
        icon={item.icon}
        labels={ITEM_TILE_LABELS}
        name={item.name}
        rarity={resolveItemRarity(item.rarity)}
        renderStat={renderStat}
        stat={stat}
        type={item.type ?? ""}
      />
      {upgradeLevel > 0 ? (
        <span className="absolute top-2 right-2 rounded-md border border-[color-mix(in_oklab,var(--item-rarity)_60%,var(--border))] bg-popover px-2 py-0.5 text-sm font-semibold text-emerald-400 tabular-nums">
          {t("upgrade.level", { level: upgradeLevel })}
        </span>
      ) : null}
    </aside>
  );
}
