import { t } from "@/i18n/messages";
import { EQUIPMENT_SLOTS } from "@/lib/equipment-slots";
import { ShortcutTile } from "./shortcut-tile";

/** Opens the item search for one equipment slot. */
export function SlotShortcuts() {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {EQUIPMENT_SLOTS.map((slot) => (
        <li key={slot.id}>
          <ShortcutTile
            icon={slot.icon}
            label={t(`slots.${slot.id}`)}
            search={{ slot: slot.id }}
            toneClassName="text-primary"
          />
        </li>
      ))}
    </ul>
  );
}
