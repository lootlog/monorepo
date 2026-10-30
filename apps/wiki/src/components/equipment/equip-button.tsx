import { Check, Plus } from "lucide-react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { Button } from "@lootlog/ui/components/button";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";
import { findEquipmentSlot } from "@/lib/equipment-slots";
import type { UpgradeLevel } from "@/lib/item-upgrade";

type EquipButtonProps = {
  item: CatalogItemDtoOutput;
  /** A compact icon button for item lists; the full label elsewhere. */
  compact?: boolean;
  /** The upgrade to wear the item at; without one, a worn item keeps its own. */
  upgrade?: UpgradeLevel;
};

/** Wears the item in the User's set; nothing for items no slot holds. */
export function EquipButton({
  item,
  compact = false,
  upgrade,
}: EquipButtonProps) {
  const { set, equip } = useEquipmentSet();
  const slot = findEquipmentSlot(item.type);

  if (!slot) return null;

  const isWorn =
    set.items[slot.id] === item.id &&
    (upgrade === undefined || (set.upgrades[slot.id] ?? 0) === upgrade);

  const label = isWorn ? t("equipment.worn") : t("equipment.equip");

  return (
    <Button
      type="button"
      variant={isWorn ? "secondary" : "outline"}
      size={compact ? "icon-sm" : "sm"}
      aria-label={compact ? `${label}: ${item.name}` : undefined}
      aria-pressed={isWorn}
      title={compact ? label : undefined}
      onClick={() => equip(item, upgrade)}
    >
      {isWorn ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
      {compact ? null : label}
    </Button>
  );
}
