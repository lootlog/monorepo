import type { ReactNode } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { Card } from "@lootlog/ui/components/card";
import { ItemTile } from "@lootlog/ui/components/item-tile";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { renderItemStat } from "@/components/render-item-stat";
import { ITEM_TILE_LABELS } from "@/lib/item-options";

type NewItemsCardProps = {
  title: string;
  details?: string;
  /** What the items belong to, drawn before the title. */
  media?: ReactNode;
  /** The link to the page of what the items belong to. */
  action?: ReactNode;
  items: readonly CatalogItemDtoOutput[];
};

/** A boss or an event with the newest of its items. */
export function NewItemsCard({
  title,
  details,
  media,
  action,
  items,
}: NewItemsCardProps) {
  return (
    <Card className="gap-3 p-4">
      <div className="flex min-h-10 items-center gap-3">
        {media}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {title}
          </h3>
          {details ? (
            <p className="truncate text-xs text-muted-foreground">{details}</p>
          ) : null}
        </div>
        {action}
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <ItemTile
              item={{
                icon: item.icon,
                name: item.name,
                rarity: resolveItemRarity(item.rarity),
                stat: item.stat,
                type: item.type,
              }}
              labels={ITEM_TILE_LABELS}
              renderStat={renderItemStat}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
