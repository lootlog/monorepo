import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { CompareButton } from "@/components/comparison/compare-button";
import { EquipButton } from "@/components/equipment/equip-button";
import { useItemPreviewHandlers } from "@/hooks/use-item-preview-handlers";
import { t } from "@/i18n/messages";
import { CatalogItemTile } from "./catalog-item-tile";
import { ItemAttackSpeed } from "./item-attack-speed";
import { ItemDamageTypes } from "./item-damage-types";
import { ItemLegendaryBonus } from "./item-legendary-bonus";
import { ItemNameLink } from "./item-name-link";
import { ItemProfessions } from "./item-professions";
import { ItemSource } from "./item-source";

type CatalogItemCardProps = {
  item: CatalogItemDtoOutput;
  /** Hides the source on a page that already belongs to one NPC. */
  showSource?: boolean;
  /** The searched phrase, marked in the name. */
  highlight?: string;
  /** Shows the attack speed the item adds, for a list ranked by it. */
  showAttackSpeed?: boolean;
};

/**
 * One item in a list as a dense row: its name over its level, professions,
 * damage types and legendary bonus, and where it drops last.
 */
export function CatalogItemCard({
  item,
  showSource = true,
  highlight = "",
  showAttackSpeed = false,
}: CatalogItemCardProps) {
  const previewHandlers = useItemPreviewHandlers(item);

  return (
    <article
      className="flex h-full min-w-0 items-center gap-2.5 rounded-md border border-border/50 bg-card px-2.5 py-2 transition-colors duration-150 hover:border-border hover:bg-accent/30 motion-reduce:transition-none"
      {...previewHandlers}
    >
      <CatalogItemTile item={item} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <ItemNameLink item={item} highlight={highlight} />
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0 tabular-nums">
            {t("common.levelShort", { level: item.lvl })}
          </span>
          {showAttackSpeed ? <ItemAttackSpeed stat={item.stat} /> : null}
          <ItemProfessions stat={item.stat} />
          <ItemDamageTypes stat={item.stat} />
          <ItemLegendaryBonus stat={item.stat} />
        </div>
        {showSource ? <ItemSource item={item} /> : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <EquipButton item={item} compact />
        <CompareButton item={item} compact />
      </div>
    </article>
  );
}
