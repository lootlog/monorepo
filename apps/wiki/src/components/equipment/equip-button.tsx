import { Check, Plus } from "lucide-react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { Button } from "@lootlog/ui/components/button";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";
import { findEquipmentSlot } from "@/lib/equipment-slots";

type EquipButtonProps = {
  item: CatalogItemDtoOutput;
  /** A compact icon button for item lists; the full label elsewhere. */
  compact?: boolean;
};

/** Wears the item in the User's set; nothing for items no slot holds. */
export function EquipButton({ item, compact = false }: EquipButtonProps) {
  const { set, equip } = useEquipmentSet();
  const slot = findEquipmentSlot(item.type);

  if (!slot) return null;

  const isWorn = set.items[slot.id] === item.id;
  const label = isWorn ? t("equipment.worn") : t("equipment.equip");

  return (
    <Button
      type="button"
      variant={isWorn ? "secondary" : "outline"}
      size={compact ? "icon-sm" : "sm"}
      aria-label={compact ? `${label}: ${item.name}` : undefined}
      aria-pressed={isWorn}
      title={compact ? label : undefined}
      onClick={() => equip(item)}
    >
      {isWorn ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
      {compact ? null : label}
    </Button>
  );
}
