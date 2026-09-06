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
    <div className="flex flex-col gap-1 border-l border-border/30 pl-4">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {t("loots.list.unassignedItems")}
      </span>
      <div className="flex flex-row flex-wrap gap-1">
        {items.map((item, itemIdx) => (
          <Fragment key={`unassigned-${item.hid}-${itemIdx}`}>
            {renderItem ? (
              renderItem(item)
            ) : (
              <WatchableItemTile
                key={`unassigned-${item.hid}-${itemIdx}`}
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
