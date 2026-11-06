import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@lootlog/ui/components/button";
import { ShareLinkButton } from "@/components/common/share-link-button";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import { encodeEquipmentSet, EQUIPMENT_SET_PARAM } from "@/lib/equipment-set";
import { EQUIPMENT_SLOTS } from "@/lib/equipment-slots";

/** The set's title with how many slots it fills, and sharing and clearing it. */
export function EquipmentSetHeader({
  titleId,
  children,
}: {
  titleId: string;
  /** More controls after clearing, such as closing the panel. */
  children?: ReactNode;
}) {
  const { set, clear } = useEquipmentSet();
  const wornItems = useWornItems();

  return (
    <div className="flex items-center gap-1">
      <h2
        id={titleId}
        className="flex flex-1 items-baseline gap-2 text-sm font-semibold text-foreground"
      >
        {t("equipment.title")}
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {t("equipment.wornCount", {
            worn: wornItems.size,
            total: EQUIPMENT_SLOTS.length,
          })}
        </span>
      </h2>
      <ShareLinkButton
        path="/set"
        param={EQUIPMENT_SET_PARAM}
        value={encodeEquipmentSet(set)}
        compact
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("equipment.clear")}
        title={t("equipment.clear")}
        disabled={wornItems.size === 0}
        onClick={clear}
      >
        <Trash2 aria-hidden="true" />
      </Button>
      {children}
    </div>
  );
}
