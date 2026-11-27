import { Settings2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@lootlog/ui/components/button";
import { EquipmentSetCharacter } from "@/components/equipment/equipment-set-character";
import { EquipmentSetDoll } from "@/components/equipment/equipment-set-doll";
import { SavedSetsButton } from "@/components/equipment/saved-sets-button";
import { useSetSummary } from "@/hooks/use-set-summary";
import { t } from "@/i18n/messages";
import { EQUIPMENT_SLOTS } from "@/lib/equipment-slots";

type FightFighterProps = {
  name: string;
  nameClassName: string;
  onEdit: () => void;
};

export function FightFighter({
  name,
  nameClassName,
  onEdit,
}: FightFighterProps) {
  const { wornItems } = useSetSummary();

  return (
    <div className="flex gap-3">
      <EquipmentSetDoll />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate text-sm font-semibold", nameClassName)}>
            {name}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("equipment.wornCount", {
              worn: wornItems.size,
              total: EQUIPMENT_SLOTS.length,
            })}
          </span>
        </div>
        <EquipmentSetCharacter />
        <div className="flex flex-wrap gap-2 *:grow">
          <Button size="xs" variant="outline" onClick={onEdit}>
            <Settings2 aria-hidden="true" />
            {t("fightPage.editSet")}
          </Button>
          <SavedSetsButton size="xs" />
        </div>
      </div>
    </div>
  );
}
