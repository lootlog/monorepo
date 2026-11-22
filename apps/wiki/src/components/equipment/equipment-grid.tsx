import type { ReactNode } from "react";
import { cn } from "cn";
import { EQUIPMENT_SLOTS, type EquipmentSlot } from "@/lib/equipment-slots";

type EquipmentGridProps = {
  renderSlot: (slot: EquipmentSlot) => ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const GRID = {
  sm: "grid-cols-[repeat(3,2.75rem)] grid-rows-[repeat(4,2.75rem)] gap-1.5",
  md: "grid-cols-[repeat(3,3.25rem)] grid-rows-[repeat(4,3.25rem)] gap-2",
  lg: "grid-cols-[repeat(3,6.25rem)] grid-rows-[repeat(4,5.5rem)] gap-2",
} as const;

export function EquipmentGrid({
  renderSlot,
  size = "md",
  className,
}: EquipmentGridProps) {
  return (
    <div className={cn("grid w-fit", GRID[size], className)}>
      {EQUIPMENT_SLOTS.map((slot) => (
        <div key={slot.id} className={cn("size-full", slot.position)}>
          {renderSlot(slot)}
        </div>
      ))}
    </div>
  );
}
