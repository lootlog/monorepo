import { type ReactNode, useState } from "react";
import { SetItemPickerContext } from "@/contexts/set-item-picker-context";
import type { EquipmentSlotId } from "@/lib/equipment-slots";
import { SetItemPicker } from "./set-item-picker";

export function SetItemPickerProvider({ children }: { children: ReactNode }) {
  const [picking, setPicking] = useState<{
    slotId: EquipmentSlotId;
    opening: number;
    isOpen: boolean;
  } | null>(null);

  return (
    <SetItemPickerContext
      value={{
        pickItem: (slotId) =>
          setPicking((current) => ({
            slotId,
            opening: (current?.opening ?? 0) + 1,
            isOpen: true,
          })),
      }}
    >
      {children}
      {picking ? (
        <SetItemPicker
          key={picking.opening}
          slotId={picking.slotId}
          open={picking.isOpen}
          onOpenChange={(isOpen) =>
            setPicking((current) => (current ? { ...current, isOpen } : null))
          }
        />
      ) : null}
    </SetItemPickerContext>
  );
}
