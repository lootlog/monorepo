import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { useRef } from "react";
import type { Item, Loot } from "@/lib/loots/loot-types";
import { LootDrawDialogBody } from "./loot-draw-dialog-body";

/**
 * The draw of one item. Anyone who sees the loot may draw it unless the
 * Organization excludes its NPC type; only loot managers void a result. It stays mounted while closed, so it animates in
 * and out.
 */
export const LootDrawDialog = ({
  loot,
  item,
  canVoid,
  canDraw,
  open,
  onOpenChange,
}: {
  loot: Loot;
  item: Item;
  canVoid: boolean;
  canDraw: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90dvh,48rem)] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-3xl lg:max-w-4xl"
        // Focus would land on the item tile in the header and open its
        // tooltip over the dialog, so it starts on the body instead.
        initialFocus={bodyRef}
      >
        <LootDrawDialogBody
          loot={loot}
          item={item}
          canVoid={canVoid}
          canDraw={canDraw}
          bodyRef={bodyRef}
        />
      </DialogContent>
    </Dialog>
  );
};
