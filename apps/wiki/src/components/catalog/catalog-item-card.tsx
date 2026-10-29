import { Link } from "@tanstack/react-router";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { ItemTile } from "@lootlog/ui/components/item-tile";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { LOOT_RARITY_TEXT_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { cn } from "cn";
import { EquipButton } from "@/components/equipment/equip-button";
import { HighlightedText } from "@/components/highlighted-text";
import { renderItemStat } from "@/components/render-item-stat";
import { useSetEquipmentPreview } from "@/contexts/equipment-preview-context";
import { t } from "@/i18n/messages";
import { itemPageParams, npcPageParams } from "@/lib/catalog-links";
import { ITEM_TILE_LABELS } from "@/lib/item-options";
import { findLegendaryBonus } from "@/lib/legendary-bonuses";

type CatalogItemCardProps = {
  item: CatalogItemDtoOutput;
  /** Hides the source on a page that already belongs to one NPC. */
  showSource?: boolean;
  /** The searched phrase, marked in the name. */
  highlight?: string;
};

/** One item in a list: its tile, a link to its page and where it drops. */
export function CatalogItemCard({
  item,
  showSource = true,
  highlight = "",
}: CatalogItemCardProps) {
  const setPreview = useSetEquipmentPreview();
  const rarity = resolveItemRarity(item.rarity);
  const [source] = item.droppedBy;
  const bonus = findLegendaryBonus(item.stat);

  // Pointing at an item compares it with the set; leaving it ends the preview.
  return (
    <article
      className="flex h-full min-w-0 items-center gap-3 rounded-lg border border-border/50 bg-card p-3 transition-colors duration-150 hover:border-border hover:bg-accent/30 motion-reduce:transition-none"
      onPointerEnter={() => setPreview(item)}
      onPointerLeave={() => setPreview(null)}
      onFocus={() => setPreview(item)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setPreview(null);
        }
      }}
    >
      <ItemTile
        item={{
          icon: item.icon,
          name: item.name,
          rarity,
          stat: item.stat,
          type: item.type,
        }}
        labels={ITEM_TILE_LABELS}
        renderStat={renderItemStat}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to="/items/$itemSlug"
          params={itemPageParams(item)}
          className={cn(
            "truncate text-sm font-semibold outline-none hover:underline focus-visible:underline",
            LOOT_RARITY_TEXT_CLASS[rarity],
          )}
        >
          <HighlightedText text={item.name} query={highlight} />
        </Link>
        <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <span className="shrink-0 tabular-nums">
            {t("common.levelShort", { level: item.lvl })}
          </span>
          {bonus ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="flex min-w-0 items-center gap-1 text-emerald-400">
                <bonus.icon aria-hidden="true" className="size-3 shrink-0" />
                <span className="truncate">
                  {t(`legendaryBonus.${bonus.name}`)}
                </span>
              </span>
            </>
          ) : null}
        </p>
        {showSource && source ? (
          <p className="truncate text-xs text-muted-foreground">
            {t("catalog.droppedBy")}{" "}
            <Link
              to="/npcs/$npcSlug"
              params={npcPageParams(source)}
              className="font-medium text-foreground outline-none hover:underline focus-visible:underline"
            >
              {source.name}
            </Link>
          </p>
        ) : null}
      </div>
      <EquipButton item={item} compact />
    </article>
  );
}
