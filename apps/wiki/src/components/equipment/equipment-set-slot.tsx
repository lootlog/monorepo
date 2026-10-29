import { Link } from "@tanstack/react-router";
import { TriangleAlert, X } from "lucide-react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { ItemTile } from "@lootlog/ui/components/item-tile";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import { renderItemStat } from "@/components/render-item-stat";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";
import { ITEM_TILE_LABELS } from "@/lib/item-options";
import type { EquipmentSlot } from "@/lib/equipment-slots";
import { findRequirementIssues } from "@/lib/item-stat-totals";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";
import { EquipmentSlotPreview } from "./equipment-slot-preview";

const SLOT_FRAME =
  "relative flex size-11 items-center justify-center rounded-md border bg-background/60 transition-[color,border-color,box-shadow] duration-200 motion-reduce:transition-none";

type EquipmentSetSlotProps = {
  slot: EquipmentSlot;
  item: CatalogItemDtoOutput | undefined;
  /** The item the User points at, which this slot would wear instead. */
  preview: CatalogItemDtoOutput | null;
};

/** One worn item, or an empty slot that opens a search for it. */
export function EquipmentSetSlot({
  slot,
  item,
  preview,
}: EquipmentSetSlotProps) {
  const { set, unequip } = useEquipmentSet();
  const label = t(`slots.${slot.id}`);
  const Icon = slot.icon;

  const previewClass =
    preview && "border-dashed border-primary ring-2 ring-primary/25";

  const overlay = preview ? (
    <EquipmentSlotPreview key={preview.id} item={preview} />
  ) : null;

  if (!item) {
    return (
      <Link
        to="/items"
        search={{
          ...EMPTY_ITEMS_SEARCH,
          slot: slot.id,
          professions: set.profession ?? "",
          maxLevel: set.level === null ? "" : String(set.level),
        }}
        aria-label={t("equipment.findForSlot", { slot: label })}
        title={label}
        className={cn(
          SLOT_FRAME,
          "border-border/60 text-muted-foreground outline-none hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring",
          previewClass,
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
        {overlay}
      </Link>
    );
  }

  const issues = findRequirementIssues(item.stat, set);

  return (
    <div
      className={cn(
        SLOT_FRAME,
        "group/slot",
        issues.length > 0 ? "border-destructive/70" : "border-border",
        previewClass,
      )}
    >
      <ItemTile
        item={{
          icon: item.icon,
          name: item.name,
          rarity: resolveItemRarity(item.rarity),
          stat: item.stat,
          type: item.type,
        }}
        labels={ITEM_TILE_LABELS}
        renderStat={renderItemStat}
      />
      {overlay}
      {issues.length > 0 ? (
        <span
          role="img"
          aria-label={issues
            .map((issue) => t(`equipment.issues.${issue}`))
            .join(" ")}
          title={issues
            .map((issue) => t(`equipment.issues.${issue}`))
            .join(" ")}
          className="absolute -bottom-1.5 -left-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-background"
        >
          <TriangleAlert aria-hidden="true" className="size-2.5" />
        </span>
      ) : null}
      <button
        type="button"
        aria-label={t("equipment.unequip", { item: item.name })}
        onClick={() => unequip(slot.id)}
        className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full border border-border bg-popover text-muted-foreground opacity-0 outline-none transition-opacity group-hover/slot:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:opacity-100 motion-reduce:transition-none"
      >
        <X aria-hidden="true" className="size-2.5" />
      </button>
    </div>
  );
}
