import { cn } from "cn";
import { useSetSummary } from "@/hooks/use-set-summary";
import { t } from "@/i18n/messages";
import { EQUIPMENT_SLOTS, weaponTakesBothHands } from "@/lib/equipment-slots";
import { EquipmentSetCharacter } from "./equipment-set-character";
import { EquipmentSetDoll } from "./equipment-set-doll";
import { EquipmentSetItemRow } from "./equipment-set-item-row";

export function EquipmentSetPanel({ className }: { className?: string }) {
  const { wornItems } = useSetSummary();

  const isSecondaryBlocked = weaponTakesBothHands(
    wornItems.get("weapon")?.item.type,
  );

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <EquipmentSetCharacter />
      <EquipmentSetDoll className="self-center" />
      <ul
        aria-label={t("setPage.itemsTitle")}
        className="flex flex-col border-t border-border/60 pt-3"
      >
        {EQUIPMENT_SLOTS.map((slot) => (
          <EquipmentSetItemRow
            key={slot.id}
            slot={slot}
            worn={wornItems.get(slot.id)}
            isBlocked={slot.id === "secondary" && isSecondaryBlocked}
          />
        ))}
      </ul>
    </div>
  );
}
