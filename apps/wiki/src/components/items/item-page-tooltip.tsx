import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import { resolveItemRarity } from "@lootlog/domain/item-rarity";
import { ItemTileDetails } from "@lootlog/ui/components/item-tile-details";
import type { ItemDisplayValue } from "@lootlog/ui/components/item-stat-utils";
import type { ReactNode } from "react";
import { t } from "@/i18n/messages";
import { ITEM_TILE_LABELS } from "@/lib/item-options";

type ItemPageTooltipProps = {
  item: CatalogItemDtoOutput;
  stat: string;
  renderStat: (displayValue: ItemDisplayValue) => ReactNode;
};

export function ItemPageTooltip({
  item,
  stat,
  renderStat,
}: ItemPageTooltipProps) {
  return (
    <aside
      aria-label={t("item.inGame")}
      className="overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--item-rarity)_40%,var(--border))] bg-popover"
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
    </aside>
  );
}
