import { WatchableItemTile } from "@/components/tiles/watchable-item-tile";
import type { WatchedItemScope } from "@/lib/user-notifications/watched-item-scope";
import type { Item } from "@/lib/loots/loot-types";
import * as m from "framer-motion/m";
import { EASE_EMPHASIZED, MOTION_DURATION } from "@/lib/motion";
import { createPortal } from "react-dom";
import { Fragment, type FC } from "react";
import type { DecorateLootItem } from "./item-stack";

type Props = {
  items: Item[];
  anchorRect: DOMRect;
  watchContext: WatchedItemScope;
  selectedItemNames: string[];
  decorateItem?: DecorateLootItem;
};

export const ItemStackExpanded: FC<Props> = ({
  items,
  anchorRect,
  watchContext,
  selectedItemNames,
  decorateItem,
}) =>
  createPortal(
    <m.div
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: MOTION_DURATION.short, ease: EASE_EMPHASIZED }}
      className="fixed z-50 flex flex-col gap-1 p-1.5 rounded-lg bg-popover/95  border border-border shadow-lg"
      style={{
        top: anchorRect.bottom + 4,
        left: anchorRect.left + anchorRect.width / 2,
        transform: "translateX(-50%)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((item) => {
        const tile = (
          <WatchableItemTile
            item={item}
            watchContext={watchContext}
            selectedItemNames={selectedItemNames}
          />
        );

        return (
          <Fragment key={item.id}>
            {decorateItem ? decorateItem(item, tile) : tile}
          </Fragment>
        );
      })}
    </m.div>,
    document.body,
  );
