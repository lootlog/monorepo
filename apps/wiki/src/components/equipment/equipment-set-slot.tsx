import { TriangleAlert, X } from "lucide-react";
import { EquipmentSlotIcon } from "@/components/equipment/equipment-slot-icon";
import { ItemTile } from "@lootlog/ui/components/item-tile";
import { resolveItemRarity } from "@lootlog/domain/item-rarity";
import { cn } from "cn";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSetItemPicker } from "@/contexts/set-item-picker-context";
import { useWornItem, type WornItem } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import { ITEM_TILE_LABELS } from "@/lib/item-options";
import {
  type EquipmentSlot,
  weaponTakesBothHands,
} from "@/lib/equipment-slots";
import { EquipmentSlotMenu } from "./equipment-slot-menu";

const SLOT_FRAME =
  "relative flex size-full items-center justify-center rounded-lg border bg-background/70 shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)] transition-[color,border-color,box-shadow] duration-200 motion-reduce:transition-none";

type EquipmentSetSlotProps = {
  slot: EquipmentSlot;
  worn: WornItem | undefined;
};

/**
 * One slot of the set. Pressing it opens the item picker for it, worn or
 * empty; the other hand beside a two-handed weapon holds nothing. An item put
 * on grows into the slot.
 */
export function EquipmentSetSlot({ slot, worn }: EquipmentSetSlotProps) {
  const { unequip } = useEquipmentSet();
  const { pickItem } = useSetItemPicker();
  const label = t(`slots.${slot.id}`);
  const weapon = useWornItem(slot.id === "secondary" ? "weapon" : undefined);

  if (!worn && weaponTakesBothHands(weapon?.item.type)) {
    return (
      <span
        role="img"
        aria-label={`${label}: ${t("equipment.slotBlocked")}`}
        title={t("equipment.slotBlocked")}
        className={cn(
          SLOT_FRAME,
          "border-dashed border-border/40 bg-transparent text-muted-foreground/40 shadow-none",
        )}
      >
        <EquipmentSlotIcon slot={slot.id} className="size-5" />
      </span>
    );
  }

  if (!worn) {
    return (
      <button
        type="button"
        aria-label={t("equipment.pickForSlot", { slot: label })}
        title={label}
        onClick={() => pickItem(slot.id)}
        className={cn(
          SLOT_FRAME,
          "cursor-pointer border-border/60 text-muted-foreground outline-none hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <EquipmentSlotIcon slot={slot.id} className="size-5" />
      </button>
    );
  }

  const { item, issues } = worn;

  return (
    <EquipmentSlotMenu
      slotId={slot.id}
      worn={worn}
      className={cn(
        SLOT_FRAME,
        "group/slot",
        issues.length > 0 ? "border-destructive/70" : "border-border",
      )}
    >
      <span
        key={`${item.id}-${worn.upgrade.level}`}
        className="flex scale-100 opacity-100 transition-[opacity,scale] duration-200 ease-out starting:scale-75 starting:opacity-0 motion-reduce:transition-none"
      >
        <ItemTile
          item={{
            icon: item.icon,
            name: item.name,
            rarity: resolveItemRarity(item.rarity),
            stat: item.stat,
            type: item.type,
          }}
          labels={ITEM_TILE_LABELS}
          render={
            <button
              type="button"
              aria-label={t("equipment.changeItem", { item: item.name })}
              onClick={() => pickItem(slot.id)}
            />
          }
        />
      </span>
      {issues.length > 0 ? (
        <span
          role="img"
          aria-label={issues
            .map((issue) => t(`equipment.issues.${issue}`))
            .join(" ")}
          title={issues
            .map((issue) => t(`equipment.issues.${issue}`))
            .join(" ")}
          className="absolute -bottom-1.5 -left-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-background"
        >
          <TriangleAlert aria-hidden="true" className="size-2.5" />
        </span>
      ) : null}
      <button
        type="button"
        aria-label={t("equipment.unequip", { item: item.name })}
        onClick={() => unequip(slot.id)}
        className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full border border-border bg-popover text-muted-foreground opacity-0 outline-none transition-opacity group-hover/slot:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:opacity-100 motion-reduce:transition-none"
      >
        <X aria-hidden="true" className="size-2.5" />
      </button>
    </EquipmentSlotMenu>
  );
}
