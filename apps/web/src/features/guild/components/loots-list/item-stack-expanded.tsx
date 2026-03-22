import { ItemTile } from "@/components/tiles";
import type { Item } from "@/hooks/api/loots/use-loots";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import type { FC } from "react";

type Props = {
  items: Item[];
  anchorRect: DOMRect;
};

export const ItemStackExpanded: FC<Props> = ({ items, anchorRect }) =>
  createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="fixed z-50 flex flex-col gap-1 p-1.5 rounded-lg bg-popover/95 backdrop-blur-md border border-border shadow-lg"
      style={{
        top: anchorRect.bottom + 4,
        left: anchorRect.left + anchorRect.width / 2,
        transform: "translateX(-50%)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => (
        <ItemTile key={`${item.hid}-${idx}`} item={item} />
      ))}
    </motion.div>,
    document.body,
  );
