import { type ReactNode, useEffect, useRef, useState } from "react";
import { EquipmentSetContext } from "@/contexts/equipment-set-context";
import { useSetEquipmentPreview } from "@/contexts/equipment-preview-context";
import {
  decodeEquipmentSet,
  EMPTY_EQUIPMENT_SET,
  encodeEquipmentSet,
  EQUIPMENT_SET_PARAM,
  type EquipmentSet,
  LEGACY_EQUIPMENT_SET_PARAM,
} from "@/lib/equipment-set";
import { findEquipmentSlot } from "@/lib/equipment-slots";

const STORAGE_KEY = "lootlog-wiki-equipment-set";

/**
 * The set opened from a shared link, or else the one this browser last had.
 * A shared link replaces the stored set and leaves the address bar, so a
 * reload keeps any changes instead of reopening the link.
 */
const readInitialSet = (): EquipmentSet => {
  const url = new URL(window.location.href);

  const shared =
    url.searchParams.get(EQUIPMENT_SET_PARAM) ??
    url.searchParams.get(LEGACY_EQUIPMENT_SET_PARAM);

  if (shared !== null) {
    url.searchParams.delete(EQUIPMENT_SET_PARAM);
    url.searchParams.delete(LEGACY_EQUIPMENT_SET_PARAM);
    window.history.replaceState(window.history.state, "", url);

    return decodeEquipmentSet(shared);
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return stored === null ? EMPTY_EQUIPMENT_SET : decodeEquipmentSet(stored);
  } catch {
    return EMPTY_EQUIPMENT_SET;
  }
};

export function EquipmentSetProvider({ children }: { children: ReactNode }) {
  // The server renders an empty set; the browser reads the real one after
  // hydration, so both render the same markup first.
  const [set, setSet] = useState<EquipmentSet | null>(null);
  const setPreview = useSetEquipmentPreview();

  const hasReadInitialSet = useRef(false);

  useEffect(() => {
    // Reading a shared link consumes it, so it is read once: a second run,
    // as Strict Mode makes, would find the link gone and open an empty set.
    if (hasReadInitialSet.current) return;

    hasReadInitialSet.current = true;
    setSet(readInitialSet());
  }, []);

  useEffect(() => {
    if (set === null) return;

    try {
      localStorage.setItem(STORAGE_KEY, encodeEquipmentSet(set));
    } catch {
      // Storage can be blocked; the set then lasts until the page closes.
    }
  }, [set]);

  const update = (change: (current: EquipmentSet) => EquipmentSet) =>
    setSet((current) => change(current ?? EMPTY_EQUIPMENT_SET));

  return (
    <EquipmentSetContext
      value={{
        set: set ?? EMPTY_EQUIPMENT_SET,
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
        clear: () => setSet(EMPTY_EQUIPMENT_SET),
        setCharacter: (character) =>
          update((current) => ({ ...current, ...character })),
      }}
    >
      {children}
    </EquipmentSetContext>
  );
}
