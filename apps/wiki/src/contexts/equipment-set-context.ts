import { createContext, useContext } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import type { EquipmentSet } from "@/lib/equipment-set";
import type { EquipmentSlotId } from "@/lib/equipment-slots";

type EquipmentSetContextValue = {
  set: EquipmentSet;
  /** Wears the item in the slot its type belongs to. */
  equip: (item: CatalogItemDtoOutput) => void;
  unequip: (slot: EquipmentSlotId) => void;
  /** Takes off every item and forgets the character. */
  clear: () => void;
  setCharacter: (character: Pick<EquipmentSet, "profession" | "level">) => void;
};

export const EquipmentSetContext =
  createContext<EquipmentSetContextValue | null>(null);

export const useEquipmentSet = () => {
  const value = useContext(EquipmentSetContext);

  if (!value) {
    throw new Error("useEquipmentSet must be used in EquipmentSetContext.");
  }

  return value;
};
