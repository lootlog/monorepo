import { createContext, useContext } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import type { EquipmentSet } from "@/lib/equipment-set";
import type { EquipmentSlotId } from "@/lib/equipment-slots";
import type { ItemUpgrade } from "@lootlog/domain/item-upgrade";

type EquipmentSetContextValue = {
  set: EquipmentSet;
  /**
   * Wears the item in the slot its type belongs to, upgraded to `upgrade`;
   * without one, an item already worn keeps its upgrade and another is worn
   * as dropped.
   */
  equip: (item: CatalogItemDtoOutput, upgrade?: ItemUpgrade) => void;
  /** Upgrades the item worn in the slot; an empty slot stays empty. */
  upgrade: (slot: EquipmentSlotId, upgrade: ItemUpgrade) => void;
  unequip: (slot: EquipmentSlotId) => void;
  /** Takes off every item, unlearns every skill and forgets the character. */
  clear: () => void;
  /**
   * Sets who wears the set. Another profession has another skill tree, so
   * changing it forgets the learned skills.
   */
  setCharacter: (character: Pick<EquipmentSet, "profession" | "level">) => void;
  /** Learns the skill to the rank; rank 0 unlearns it. */
  setSkillRank: (skillId: number, rank: number) => void;
  /** Unlearns every skill, as the game's skill reset does. */
  resetSkills: () => void;
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
