import { useEquipmentPreview } from "@/contexts/equipment-preview-context";
import { useWornItems } from "@/hooks/use-worn-items";
import { findEquipmentSlot } from "@/lib/equipment-slots";
import { sumItemStats } from "@/lib/item-stat-totals";

/**
 * The set as worn, its stats added up, and the stats it would have with
 * the item the User points at worn instead of the one in its slot.
 */
export const useSetSummary = () => {
  const preview = useEquipmentPreview();
  const wornItems = useWornItems();
  const previewSlot = preview ? findEquipmentSlot(preview.type) : undefined;

  const totals = sumItemStats(
    [...wornItems.values()].map(({ item }) => item.stat),
  );

  const previewTotals =
    preview && previewSlot
      ? sumItemStats([
          ...[...wornItems].flatMap(([slotId, { item }]) =>
            slotId === previewSlot.id ? [] : [item.stat],
          ),
          preview.stat,
        ])
      : null;

  return {
    wornItems,
    preview: previewSlot ? preview : null,
    previewSlot,
    totals,
    previewTotals,
  };
};
