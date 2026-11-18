import { cn } from "cn";
import { useSetSummary } from "@/hooks/use-set-summary";
import { EquipmentGrid } from "./equipment-grid";
import { EquipmentSetSlot } from "./equipment-set-slot";

/** The set's slots as the game draws them, each just larger than its item. */
export function EquipmentSetDoll({ className }: { className?: string }) {
  const { wornItems } = useSetSummary();

  return (
    <EquipmentGrid
      size="sm"
      className={cn("shrink-0", className)}
      renderSlot={(slot) => (
        <EquipmentSetSlot slot={slot} worn={wornItems.get(slot.id)} />
      )}
    />
  );
}
