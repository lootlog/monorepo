import { Trash2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ShareLinkButton } from "@/components/common/share-link-button";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";
import { encodeEquipmentSet, EQUIPMENT_SET_PARAM } from "@/lib/equipment-set";

/** Sharing the set as a link and clearing it. */
export function EquipmentSetActions({
  compact = false,
}: {
  /** Icons alone, for a panel's header. */
  compact?: boolean;
}) {
  const { set, clear } = useEquipmentSet();

  const isEmpty =
    Object.keys(set.items).length === 0 &&
    Object.keys(set.skills).length === 0 &&
    set.profession === null &&
    set.level === null;

  return (
    <>
      <ShareLinkButton
        path="/set"
        param={EQUIPMENT_SET_PARAM}
        value={encodeEquipmentSet(set)}
        compact={compact}
      />
      <Button
        type="button"
        variant={compact ? "ghost" : "outline"}
        size={compact ? "icon-sm" : "sm"}
        aria-label={compact ? t("equipment.clear") : undefined}
        title={compact ? t("equipment.clear") : undefined}
        disabled={isEmpty}
        onClick={clear}
      >
        <Trash2 aria-hidden="true" />
        {compact ? null : t("equipment.clear")}
      </Button>
    </>
  );
}
