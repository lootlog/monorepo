import { createContext, useContext } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import type { EquipmentSet } from "@/lib/equipment-set";
import type { EquipmentSlotId } from "@/lib/equipment-slots";
import type { UpgradeLevel } from "@/lib/item-upgrade";

type EquipmentSetContextValue = {
  set: EquipmentSet;
  /**
   * Wears the item in the slot its type belongs to, upgraded to `upgrade`;
   * without one, an item already worn keeps its upgrade and another is worn
   * as dropped.
   */
  equip: (item: CatalogItemDtoOutput, upgrade?: UpgradeLevel) => void;
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
