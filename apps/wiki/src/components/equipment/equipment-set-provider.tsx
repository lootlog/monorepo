import type { ReactNode } from "react";
import { EquipmentSetContext } from "@/contexts/equipment-set-context";
import { useSetEquipmentPreview } from "@/contexts/equipment-preview-context";
import { useSharedStoredState } from "@/hooks/use-shared-stored-state";
import {
  decodeEquipmentSet,
  EMPTY_EQUIPMENT_SET,
  encodeEquipmentSet,
  EQUIPMENT_SET_PARAM,
  LEGACY_EQUIPMENT_SET_PARAM,
} from "@/lib/equipment-set";
import { findEquipmentSlot } from "@/lib/equipment-slots";

const STORED_SET = {
  storageKey: "lootlog-wiki-equipment-set",
  params: [EQUIPMENT_SET_PARAM, LEGACY_EQUIPMENT_SET_PARAM],
  encode: encodeEquipmentSet,
  decode: decodeEquipmentSet,
  empty: EMPTY_EQUIPMENT_SET,
};

export function EquipmentSetProvider({ children }: { children: ReactNode }) {
  const [set, update] = useSharedStoredState(STORED_SET);
  const setPreview = useSetEquipmentPreview();

  return (
    <EquipmentSetContext
      value={{
        set,
        equip: (item, upgrade) => {
          const slot = findEquipmentSlot(item.type);

          if (!slot) return;

          update((current) => {
            const {
              items: { [slot.id]: wornId },
              upgrades: { [slot.id]: wornUpgrade, ...upgrades },
            } = current;

            const nextUpgrade =
              upgrade ?? (wornId === item.id ? wornUpgrade : undefined);

            return {
              ...current,
              items: { ...current.items, [slot.id]: item.id },
              upgrades:
                nextUpgrade && nextUpgrade.level > 0
                  ? { ...upgrades, [slot.id]: nextUpgrade }
                  : upgrades,
            };
          });
          setPreview(null);
        },
        upgrade: (slotId, upgrade) =>
          update((current) => {
            if (current.items[slotId] === undefined) return current;

            const { [slotId]: _previous, ...upgrades } = current.upgrades;

            return {
              ...current,
              upgrades:
                upgrade.level > 0
                  ? { ...upgrades, [slotId]: upgrade }
                  : upgrades,
            };
          }),
        unequip: (slotId) =>
          update(
            ({
              items: { [slotId]: _removed, ...items },
              upgrades: { [slotId]: _upgrade, ...upgrades },
              ...current
            }) => ({ ...current, items, upgrades }),
          ),
        clear: () => update(() => EMPTY_EQUIPMENT_SET),
        setCharacter: (character) =>
          update((current) => ({ ...current, ...character })),
      }}
    >
      {children}
    </EquipmentSetContext>
  );
}
