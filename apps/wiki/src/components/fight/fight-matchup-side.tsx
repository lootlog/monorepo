import { Settings2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@lootlog/ui/components/button";
import { EquipmentSetCharacter } from "@/components/equipment/equipment-set-character";
import { t } from "@/i18n/messages";

type FightMatchupSideProps = {
  name: string;
  nameClassName: string;
  onEdit: () => void;
};

export function FightMatchupSide({
  name,
  nameClassName,
  onEdit,
}: FightMatchupSideProps) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-2">
      <span className={cn("truncate text-xs font-semibold", nameClassName)}>
        {name}
      </span>
      <EquipmentSetCharacter />
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={onEdit}
        aria-label={`${t("fightPage.editSet")}: ${name}`}
        title={t("fightPage.editSet")}
      >
        <Settings2 aria-hidden="true" />
      </Button>
    </div>
  );
}
