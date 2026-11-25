import { BATTLE_TEXT_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { SectionCardContent } from "@lootlog/ui/components/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Separator } from "@lootlog/ui/components/separator";
import { EquipmentSetEditor } from "@/components/equipment/equipment-set-editor";
import { SetItemPickerProvider } from "@/components/equipment/set-item-picker-provider";
import { t } from "@/i18n/messages";
import type { EquipmentSet } from "@/lib/equipment-set";
import { FightFighter } from "./fight-fighter";

type FightFightersProps = {
  opponentSet: EquipmentSet;
  updateOpponent: (update: (set: EquipmentSet) => EquipmentSet) => void;
  onEdit: (side: "mine" | "opponent") => void;
};

export function FightFighters({
  opponentSet,
  updateOpponent,
  onEdit,
}: FightFightersProps) {
  return (
    <SectionCard aria-labelledby="fight-fighters" className="@container">
      <SectionCardHeader
        id="fight-fighters"
        title={t("fightPage.fightersTitle")}
      />
      <SectionCardContent className="flex flex-col gap-3 @3xl:flex-row @3xl:gap-8 @3xl:*:flex-1">
        <FightFighter
          name={t("fightPage.myName")}
          nameClassName={BATTLE_TEXT_COLORS.team.friendly}
          onEdit={() => onEdit("mine")}
        />
        <Separator className="@3xl:hidden" />
        <EquipmentSetEditor set={opponentSet} update={updateOpponent}>
          <SetItemPickerProvider>
            <FightFighter
              name={t("fightPage.opponentName")}
              nameClassName={BATTLE_TEXT_COLORS.team.enemy}
              onEdit={() => onEdit("opponent")}
            />
          </SetItemPickerProvider>
        </EquipmentSetEditor>
      </SectionCardContent>
    </SectionCard>
  );
}
