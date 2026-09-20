import { WatchableItemTile } from "@/components/tiles/watchable-item-tile";
import type { Item } from "@/lib/loots/loot-types";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { useTranslation } from "react-i18next";
import { Fragment, type ReactNode } from "react";

export const LootUnassignedItems = ({
  items,
  watchContext,
  selectedItemNames,
  renderItem,
}: {
  items: Item[];
  watchContext: WatchedItemScope;
  selectedItemNames: string[];
  renderItem?: (item: Item) => ReactNode;
}) => {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <div className="flex max-w-full flex-col gap-1.5 @max-md:basis-full @max-md:border-t @max-md:border-border/40 @max-md:pt-2.5 @md:border-l @md:border-border/40 @md:pl-4">
      <span className="text-[11px] font-medium leading-none text-muted-foreground">
        {t("loots.list.unassignedItems")}
      </span>
      <div className="flex flex-row flex-wrap gap-1.5">
        {items.map((item, itemIdx) => (
          <Fragment key={`unassigned-${item.hid}-${itemIdx}`}>
            {renderItem ? (
              renderItem(item)
            ) : (
              <WatchableItemTile
                item={item}
                watchContext={watchContext}
                selectedItemNames={selectedItemNames}
              />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
};
