import { WatchableItemTile } from "@/components/tiles";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import type { Item } from "@/lib/loots/loot-types";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import type { FC } from "react";

type Props = {
  items: Item[];
  anchorRect: DOMRect;
  watchContext: WatchedItemScope;
  selectedItemNames: string[];
};

export const ItemStackExpanded: FC<Props> = ({
  items,
  anchorRect,
  watchContext,
  selectedItemNames,
}) =>
  createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="fixed z-50 flex flex-col gap-1 p-1.5 rounded-lg bg-popover/95  border border-border shadow-lg"
      style={{
        top: anchorRect.bottom + 4,
        left: anchorRect.left + anchorRect.width / 2,
        transform: "translateX(-50%)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => (
        <WatchableItemTile
          key={`${item.hid}-${idx}`}
          item={item}
          watchContext={watchContext}
          selectedItemNames={selectedItemNames}
        />
      ))}
    </motion.div>,
    document.body,
  );
