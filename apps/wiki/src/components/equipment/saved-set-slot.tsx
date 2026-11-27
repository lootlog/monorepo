import { ItemTile } from "@lootlog/ui/components/item-tile";
import { resolveItemRarity } from "@lootlog/domain/item-rarity";
import { cn } from "cn";
import type { WornItem } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import { ITEM_TILE_LABELS } from "@/lib/item-options";
import type { EquipmentSlot } from "@/lib/equipment-slots";
import { EquipmentSlotIcon } from "./equipment-slot-icon";
import { SLOT_FRAME } from "./equipment-slot-frame";

type SavedSetSlotProps = {
  slot: EquipmentSlot;
  worn: WornItem | undefined;
};

export function SavedSetSlot({ slot, worn }: SavedSetSlotProps) {
  if (!worn) {
    return (
      <span
        role="img"
        aria-label={t("savedSets.emptySlot", { slot: t(`slots.${slot.id}`) })}
        className={cn(
          SLOT_FRAME,
          "border-dashed border-border/50 bg-transparent text-muted-foreground/40 shadow-none",
        )}
      >
        <EquipmentSlotIcon slot={slot.id} className="size-5" />
      </span>
    );
  }

  const { item } = worn;

  return (
    <span className={cn(SLOT_FRAME, "border-border")}>
      <ItemTile
        item={{
          icon: item.icon,
          name: item.name,
          rarity: resolveItemRarity(item.rarity),
          stat: item.stat,
          type: item.type,
        }}
        labels={ITEM_TILE_LABELS}
      />
    </span>
  );
}
