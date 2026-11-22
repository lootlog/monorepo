import { WatchableItemTile } from "@/components/tiles/watchable-item-tile";
import type { Item } from "@/lib/loots/loot-types";
import type { WatchedItemScope } from "@/lib/user-notifications/watched-item-scope";
import { useTranslation } from "react-i18next";
import { Fragment } from "react";
import type { DecorateLootItem } from "./item-stack";

export const LootUnassignedItems = ({
  items,
  watchContext,
  selectedItemNames,
  decorateItem,
}: {
  items: Item[];
  watchContext: WatchedItemScope;
  selectedItemNames: string[];
  decorateItem?: DecorateLootItem;
}) => {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <div className="flex max-w-full flex-col gap-1.5 @max-md:basis-full @max-md:border-t @max-md:border-border/40 @max-md:pt-2.5 @md:border-l @md:border-border/40 @md:pl-4">
      <span className="text-2xs font-medium leading-none text-muted-foreground">
        {t("loots.list.unassignedItems")}
      </span>
      <div className="flex flex-row flex-wrap gap-1.5">
        {items.map((item, itemIdx) => {
          const tile = (
            <WatchableItemTile
              item={item}
              watchContext={watchContext}
              selectedItemNames={selectedItemNames}
            />
          );

          return (
            <Fragment key={`unassigned-${item.hid}-${itemIdx}`}>
              {decorateItem ? decorateItem(item, tile) : tile}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};
