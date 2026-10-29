import { Link } from "@tanstack/react-router";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { ItemTile } from "@lootlog/ui/components/item-tile";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { LOOT_RARITY_TEXT_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { cn } from "cn";
import { EquipButton } from "@/components/equipment/equip-button";
import { renderItemStat } from "@/components/render-item-stat";
import { useSetEquipmentPreview } from "@/contexts/equipment-preview-context";
import { t } from "@/i18n/messages";
import { formatFirstSeenOn, ITEM_TILE_LABELS } from "@/lib/item-options";

type CatalogItemCardProps = {
  item: CatalogItemDtoOutput;
  /** Hides the source on a page that already belongs to one NPC. */
  showSource?: boolean;
};

/** One item in a list: its tile, a link to its page and where it drops. */
export function CatalogItemCard({
  item,
  showSource = true,
}: CatalogItemCardProps) {
  const setPreview = useSetEquipmentPreview();
  const rarity = resolveItemRarity(item.rarity);
  const [source] = item.droppedBy;

  // Pointing at an item compares it with the set; leaving it ends the preview.
  return (
    <article
      className="flex min-w-0 items-center gap-3 rounded-lg border border-border/50 bg-card p-3"
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
          to="/items/$itemId"
          params={{ itemId: String(item.id) }}
          className={cn(
            "truncate text-sm font-semibold outline-none hover:underline focus-visible:underline",
            LOOT_RARITY_TEXT_CLASS[rarity],
          )}
        >
          {item.name}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {t("common.levelShort", { level: item.lvl })}
          {item.firstSeenOn
            ? ` · ${formatFirstSeenOn(item.firstSeenOn)}`
            : null}
        </p>
        {showSource && source ? (
          <p className="truncate text-xs text-muted-foreground">
            {t("catalog.droppedBy")}{" "}
            <Link
              to="/npcs/$npcKey"
              params={{ npcKey: source.key }}
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
