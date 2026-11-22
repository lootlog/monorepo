import { createContext, useContext } from "react";
import type { EquipmentSlotId } from "@/lib/equipment-slots";

type SetItemPickerContextValue = {
  pickItem: (slot: EquipmentSlotId) => void;
};

export const SetItemPickerContext =
  createContext<SetItemPickerContextValue | null>(null);

export const useSetItemPicker = () => {
  const value = useContext(SetItemPickerContext);

  if (!value) {
    throw new Error("useSetItemPicker must be used in SetItemPickerContext.");
  }

  return value;
};
