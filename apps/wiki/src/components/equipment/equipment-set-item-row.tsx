import { Plus, Replace, TriangleAlert } from "lucide-react";
import { EquipmentSlotIcon } from "@/components/equipment/equipment-slot-icon";
import { Button } from "@lootlog/ui/components/button";
import { ItemNameLink } from "@/components/catalog/item-name-link";
import { useSetItemPicker } from "@/contexts/set-item-picker-context";
import type { WornItem } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import type { EquipmentSlot } from "@/lib/equipment-slots";

type EquipmentSetItemRowProps = {
  slot: EquipmentSlot;
  worn: WornItem | undefined;
  /** An empty slot no item can go in, such as beside a two-handed weapon. */
  isBlocked: boolean;
};

/**
 * One slot of the set as a line of text: what it holds, how far that is
 * upgraded and its level, with a way to pick an item for it.
 */
export function EquipmentSetItemRow({
  slot,
  worn,
  isBlocked,
}: EquipmentSetItemRowProps) {
  const { pickItem } = useSetItemPicker();
  const label = t(`slots.${slot.id}`);
  const issues = worn?.issues.map((issue) => t(`equipment.issues.${issue}`));

  return (
    <li className="grid min-h-7 grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-x-2.5 text-[0.8125rem]">
      <span role="img" aria-label={label} title={label}>
        <EquipmentSlotIcon
          slot={slot.id}
          className="size-4 text-muted-foreground"
        />
      </span>
      {worn ? (
        <>
          <span className="flex min-w-0 items-center gap-1.5">
            <ItemNameLink
              item={worn.item}
              upgrade={worn.upgrade}
              highlight=""
            />
            {worn.upgrade.level > 0 ? (
              <span className="shrink-0 text-xs font-semibold text-signal-ready tabular-nums">
                {t("upgrade.level", { level: worn.upgrade.level })}
              </span>
            ) : null}
            {issues && issues.length > 0 ? (
              <span
                role="img"
                aria-label={issues.join(" ")}
                title={issues.join(" ")}
                className="shrink-0 text-destructive"
              >
                <TriangleAlert aria-hidden="true" className="size-3.5" />
              </span>
            ) : null}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
            {t("common.levelShort", { level: worn.item.lvl })}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t("equipment.changeItem", { item: worn.item.name })}
              title={t("equipment.change")}
              onClick={() => pickItem(slot.id)}
            >
              <Replace aria-hidden="true" />
            </Button>
          </span>
        </>
      ) : isBlocked ? (
        <span className="col-span-2 truncate text-xs text-muted-foreground/70">
          {t("equipment.slotBlocked")}
        </span>
      ) : (
        <button
          type="button"
          aria-label={t("equipment.pickForSlot", { slot: label })}
          onClick={() => pickItem(slot.id)}
          className="col-span-2 flex w-fit cursor-pointer items-center gap-1 rounded-sm text-xs text-muted-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          {label}
          <Plus aria-hidden="true" className="size-3" />
        </button>
      )}
    </li>
  );
}
