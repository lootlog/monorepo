import { Check, Scale } from "lucide-react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { Button } from "@lootlog/ui/components/button";
import { useItemComparison } from "@/contexts/item-comparison-context";
import { t } from "@/i18n/messages";
import { MAX_COMPARED_ITEMS } from "@/lib/item-comparison";
import { type ItemUpgrade, NO_UPGRADE } from "@/lib/item-upgrade";

type CompareButtonProps = {
  item: Pick<CatalogItemDtoOutput, "id" | "name">;
  /** A compact icon button for item lists; the full label elsewhere. */
  compact?: boolean;
  /** The upgrade the item joins the comparison at. */
  upgrade?: ItemUpgrade;
};

/** Adds the item to the comparison, or takes it out again. */
export function CompareButton({
  item,
  compact = false,
  upgrade = NO_UPGRADE,
}: CompareButtonProps) {
  const { items, add, remove } = useItemComparison();
  const isCompared = items.some(({ id }) => id === item.id);
  const isFull = !isCompared && items.length >= MAX_COMPARED_ITEMS;

  const label = isCompared
    ? t("comparison.compared")
    : isFull
      ? t("comparison.full", { count: MAX_COMPARED_ITEMS })
      : t("comparison.add");

  return (
    <Button
      type="button"
      variant={isCompared ? "secondary" : "outline"}
      size={compact ? "icon-sm" : "sm"}
      aria-label={compact ? `${label}: ${item.name}` : undefined}
      aria-pressed={isCompared}
      title={compact || isFull ? label : undefined}
      disabled={isFull}
      onClick={() => (isCompared ? remove(item.id) : add(item.id, upgrade))}
    >
      {isCompared && !compact ? (
        <Check aria-hidden="true" />
      ) : (
        <Scale aria-hidden="true" />
      )}
      {compact ? null : label}
    </Button>
  );
}
