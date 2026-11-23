import { Check, Plus } from "lucide-react";
import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import { Button } from "@lootlog/ui/components/button";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";
import { findEquipmentSlot } from "@/lib/equipment-slots";
import {
  isSameUpgrade,
  type ItemUpgrade,
  NO_UPGRADE,
} from "@lootlog/domain/item-upgrade";

type EquipButtonProps = {
  item: CatalogItemDtoOutput;
  compact?: boolean;
  upgrade?: ItemUpgrade;
};

export function EquipButton({
  item,
  compact = false,
  upgrade,
}: EquipButtonProps) {
  const { set, equip } = useEquipmentSet();
  const slot = findEquipmentSlot(item.type);

  if (!slot) return null;

  const worn = set.upgrades[slot.id] ?? NO_UPGRADE;

  const isWorn =
    set.items[slot.id] === item.id &&
    (upgrade === undefined || isSameUpgrade(worn, upgrade));

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
      {isWorn ? (
        <Check
          aria-hidden="true"
          className="animate-pop-in motion-reduce:animate-none"
        />
      ) : (
        <Plus aria-hidden="true" />
      )}
      {compact ? null : label}
    </Button>
  );
}
