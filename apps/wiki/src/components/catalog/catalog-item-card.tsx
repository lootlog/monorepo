import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { CompareButton } from "@/components/comparison/compare-button";
import { EquipButton } from "@/components/equipment/equip-button";
import { useItemForCharacter } from "@/hooks/use-item-for-character";
import { t } from "@/i18n/messages";
import {
  attackSpeedUpgrade,
  NO_UPGRADE,
  upgradeItemStat,
} from "@lootlog/domain/item-upgrade";
import { CatalogItemTile } from "./catalog-item-tile";
import { type AttackSpeedRanking, ItemAttackSpeed } from "./item-attack-speed";
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
  /** The highest level the list is filtered to, which an elastic item fits. */
  maxLevel?: number;
  /** Shows the attack speed the item adds, for a list ranked by it. */
  attackSpeed?: AttackSpeedRanking;
};

/**
 * One item in a list as a dense row: its name over its level, professions,
 * damage types and legendary bonus, and where it drops last. An elastic item
 * shows as the set's character would loot it, and a list ranked by attack
 * speed at +5 shows each item at the upgrade it is ranked at, from its
 * tooltip to its page and the set.
 */
export function CatalogItemCard({
  item,
  showSource = true,
  highlight = "",
  maxLevel,
  attackSpeed,
}: CatalogItemCardProps) {
  const looted = useItemForCharacter(item, maxLevel);

  const upgrade =
    attackSpeed === "upgraded" ? attackSpeedUpgrade(looted) : NO_UPGRADE;

  const shown = { ...looted, stat: upgradeItemStat(looted, upgrade) };

  return (
    <article className="flex h-full min-w-0 items-center gap-2.5 rounded-md border border-border/50 bg-card px-2.5 py-2 transition-colors duration-150 hover:border-border hover:bg-accent/30 motion-reduce:transition-none">
      <CatalogItemTile item={looted} upgrade={upgrade} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <ItemNameLink item={item} upgrade={upgrade} highlight={highlight} />
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0 tabular-nums">
            {t("common.levelShort", { level: shown.lvl })}
          </span>
          {attackSpeed ? (
            <ItemAttackSpeed stat={shown.stat} bonus={upgrade.bonus} />
          ) : null}
          <ItemProfessions stat={shown.stat} />
          <ItemDamageTypes stat={shown.stat} />
          <ItemLegendaryBonus stat={shown.stat} />
        </div>
        {showSource ? <ItemSource item={item} /> : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <EquipButton
          item={item}
          upgrade={upgrade.level > 0 ? upgrade : undefined}
          compact
        />
        <CompareButton item={item} upgrade={upgrade} compact />
      </div>
    </article>
  );
}
