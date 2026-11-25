import { createContext, useContext } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import type { EquipmentSet } from "@/lib/equipment-set";
import type { EquipmentSlotId } from "@/lib/equipment-slots";
import type { BattleMastery } from "@/lib/skills/battle-mastery";
import type { ItemUpgrade } from "@lootlog/domain/item-upgrade";

export type EquipEvent = {
  slotId: EquipmentSlotId;
  serial: number;
};

type EquipmentSetContextValue = {
  set: EquipmentSet;
  lastEquip: EquipEvent | null;
  equip: (item: CatalogItemDtoOutput, upgrade?: ItemUpgrade) => void;
  upgrade: (slot: EquipmentSlotId, upgrade: ItemUpgrade) => void;
  unequip: (slot: EquipmentSlotId) => void;
  clear: () => void;
  setCharacter: (character: Pick<EquipmentSet, "profession" | "level">) => void;
  setSkillRank: (skillId: number, rank: number) => void;
  resetSkills: () => void;
  changeMastery: (change: (mastery: BattleMastery) => BattleMastery) => void;
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
