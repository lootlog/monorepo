import { type ReactNode, useState } from "react";
import {
  type EquipEvent,
  EquipmentSetContext,
} from "@/contexts/equipment-set-context";
import { useSharedStoredState } from "@/hooks/use-shared-stored-state";
import {
  decodeEquipmentSet,
  EMPTY_EQUIPMENT_SET,
  encodeEquipmentSet,
  EQUIPMENT_SET_PARAM,
  equipItem,
  LEGACY_EQUIPMENT_SET_PARAM,
  unequipSlot,
} from "@/lib/equipment-set";
import { findEquipmentSlot } from "@/lib/equipment-slots";
import { useSetCatalogItems } from "@/hooks/use-worn-items";
import { isCrafted } from "@lootlog/domain/item-upgrade";

const STORED_SET = {
  storageKey: "lootlog-wiki-equipment-set",
  params: [EQUIPMENT_SET_PARAM, LEGACY_EQUIPMENT_SET_PARAM],
  encode: encodeEquipmentSet,
  decode: decodeEquipmentSet,
  empty: EMPTY_EQUIPMENT_SET,
};

export function EquipmentSetProvider({ children }: { children: ReactNode }) {
  const [set, update] = useSharedStoredState(STORED_SET);
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
          update((current) => {
            if (current.items[slotId] === undefined) return current;

            const { [slotId]: _previous, ...upgrades } = current.upgrades;

            return {
              ...current,
              upgrades: isCrafted(upgrade)
                ? { ...upgrades, [slotId]: upgrade }
                : upgrades,
            };
          }),
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
          update(
            ({ skills: { [skillId]: _previous, ...skills }, ...current }) => ({
              ...current,
              skills: rank > 0 ? { ...skills, [skillId]: rank } : skills,
            }),
          ),
        resetSkills: () => update((current) => ({ ...current, skills: {} })),
      }}
    >
      {children}
    </EquipmentSetContext>
  );
}
