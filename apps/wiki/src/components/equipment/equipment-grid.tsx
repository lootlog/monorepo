import type { ReactNode } from "react";
import { cn } from "cn";
import { EQUIPMENT_SLOTS, type EquipmentSlot } from "@/lib/equipment-slots";

type EquipmentGridProps = {
  /** One slot's content, placed where the game draws that slot. */
  renderSlot: (slot: EquipmentSlot) => ReactNode;
  className?: string;
};

/** Margonem's equipment grid: three columns, four rows. */
export function EquipmentGrid({ renderSlot, className }: EquipmentGridProps) {
  return (
    <div
      className={cn(
        "grid w-fit grid-cols-[repeat(3,2.75rem)] grid-rows-[repeat(4,2.75rem)] gap-1.5",
        className,
      )}
    >
      {EQUIPMENT_SLOTS.map((slot) => (
        <div key={slot.id} className={cn("size-11", slot.position)}>
          {renderSlot(slot)}
        </div>
      ))}
    </div>
  );
}
