import { type ReactNode, useState } from "react";
import {
  type EquipEvent,
  EquipmentSetContext,
} from "@/contexts/equipment-set-context";
import {
  EMPTY_EQUIPMENT_SET,
  type EquipmentSet,
  equipItem,
  rankSkill,
  unequipSlot,
  upgradeSlot,
} from "@/lib/equipment-set";
import { findEquipmentSlot } from "@/lib/equipment-slots";
import { useSetCatalogItems } from "@/hooks/use-worn-items";

type EquipmentSetEditorProps = {
  set: EquipmentSet;
  update: (change: (current: EquipmentSet) => EquipmentSet) => void;
  children: ReactNode;
};

export function EquipmentSetEditor({
  set,
  update,
  children,
}: EquipmentSetEditorProps) {
  const { itemsById } = useSetCatalogItems(set);
  const [lastEquip, setLastEquip] = useState<EquipEvent | null>(null);

  return (
    <EquipmentSetContext
      value={{
        set,
        lastEquip,
        equip: (item, upgrade) => {
          const slot = findEquipmentSlot(item.type);

          if (slot) {
            setLastEquip((previous) => ({
              slotId: slot.id,
              serial: (previous?.serial ?? 0) + 1,
            }));
          }

          update((current) =>
            equipItem(
              current,
              item,
              upgrade,
              (itemId) => itemsById.get(itemId)?.type,
            ),
          );
        },
        upgrade: (slotId, upgrade) =>
          update((current) => upgradeSlot(current, slotId, upgrade)),
        unequip: (slotId) => update((current) => unequipSlot(current, slotId)),
        clear: () => update(() => EMPTY_EQUIPMENT_SET),
        setCharacter: (character) =>
          update((current) => ({
            ...current,
            ...character,
            skills:
              character.profession === current.profession ? current.skills : {},
          })),
        setSkillRank: (skillId, rank) =>
          update((current) => rankSkill(current, skillId, rank)),
        resetSkills: () => update((current) => ({ ...current, skills: {} })),
      }}
    >
      {children}
    </EquipmentSetContext>
  );
}
