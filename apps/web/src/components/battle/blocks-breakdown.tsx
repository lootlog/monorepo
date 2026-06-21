import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { BattleBreakdownTable } from "./battle-breakdown-table";
import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";

interface BlocksBreakdownProps {
  warrior: Warrior;
}

export const BlocksBreakdown: FC<BlocksBreakdownProps> = ({ warrior }) => {
  const { t } = useTranslation();
  const blocksBreakdown = [
    {
      type: t("battleUi.breakdowns.blocks.blocks"),
      value: warrior.blocks,
      color: BATTLE_TEXT_COLORS.defense.block,
    },
    {
      type: t("battleUi.breakdowns.blocks.blockedDamage"),
      value: warrior.blockedDamage,
      color: BATTLE_TEXT_COLORS.defense.blockedDamage,
    },
  ].filter((item) => item.value > 0);

  if (blocksBreakdown.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-background hover:bg-background">
        {t("battleUi.breakdowns.blocks.empty")}
      </div>
    );
  }

  return (
    <div className="p-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        {t("battleUi.breakdowns.blocks.title", { name: warrior.name })}
      </h4>
      <BattleBreakdownTable
        rows={blocksBreakdown}
        typeLabel={t("battleUi.breakdowns.headers.type")}
        valueLabel={t("battleUi.breakdowns.headers.value")}
      />
    </div>
  );
};
