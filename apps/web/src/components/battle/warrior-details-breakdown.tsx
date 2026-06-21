import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { BattleBreakdownTable } from "./battle-breakdown-table";
import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";

interface WarriorDetailsBreakdownProps {
  warrior: Warrior;
}

export const WarriorDetailsBreakdown: FC<WarriorDetailsBreakdownProps> = ({
  warrior,
}) => {
  const { t } = useTranslation();
  const healingStats = [
    {
      type: t("battleUi.breakdowns.details.passiveHealing"),
      value: warrior.passiveHealing,
      color: BATTLE_TEXT_COLORS.healing.passive,
    },
    {
      type: t("battleUi.breakdowns.details.activeHealing"),
      value: warrior.activeHealing,
      color: BATTLE_TEXT_COLORS.healing.active,
    },
  ].filter((item) => item.value > 0);

  const offensiveStats = [
    {
      type: t("battleUi.breakdowns.details.armorPierces"),
      value: warrior.armorPierces,
      color: BATTLE_TEXT_COLORS.defense.destroy,
    },
    {
      type: t("battleUi.breakdowns.details.fastArrows"),
      value: warrior.fastArrows,
      color: BATTLE_TEXT_COLORS.defense.destroy,
    },
    {
      type: t("battleUi.breakdowns.details.reducedArmor"),
      value: warrior.reducedArmor,
      color: BATTLE_TEXT_COLORS.defense.destroy,
    },
    {
      type: t("battleUi.breakdowns.details.destroyedResistances"),
      value: warrior.magicResistanceDestroyed,
      color: BATTLE_TEXT_COLORS.defense.destroy,
    },
    {
      type: t("battleUi.breakdowns.details.reducedPoisonResistance"),
      value: warrior.reducedPoisonResistance,
      color: BATTLE_TEXT_COLORS.defense.destroy,
    },
  ].filter((item) => item.value > 0);

  const defensiveStats = [
    {
      type: t("battleUi.breakdowns.details.counters"),
      value: warrior.counters,
      color: BATTLE_TEXT_COLORS.defense.counter,
    },
  ].filter((item) => item.value > 0);

  const resourceStats = [
    {
      type: t("battleUi.breakdowns.details.destroyedEnergy"),
      value: warrior.destroyedEnergy,
      color: BATTLE_TEXT_COLORS.resources.energy,
    },
    {
      type: t("battleUi.breakdowns.details.destroyedMana"),
      value: warrior.destroyedMana,
      color: BATTLE_TEXT_COLORS.resources.mana,
    },
    {
      type: t("battleUi.breakdowns.details.regeneratedEnergy"),
      value: warrior.regeneratedEnergy,
      color: BATTLE_TEXT_COLORS.resources.energy,
    },
  ].filter((item) => item.value > 0);

  const sections = [
    { title: t("battleUi.breakdowns.details.healing"), stats: healingStats },
    {
      title: t("battleUi.breakdowns.details.offensiveEffects"),
      stats: offensiveStats,
    },
    {
      title: t("battleUi.breakdowns.details.defensiveEffects"),
      stats: defensiveStats,
    },
    { title: t("battleUi.breakdowns.details.resources"), stats: resourceStats },
  ].filter((section) => section.stats.length > 0);

  if (sections.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-background hover:bg-background">
        {t("battleUi.breakdowns.details.empty")}
      </div>
    );
  }

  return (
    <div className="p-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        {t("battleUi.breakdowns.details.title", { name: warrior.name })}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h5 className="font-medium text-xs mb-2 text-muted-foreground">
              {section.title}
            </h5>
            <BattleBreakdownTable
              rows={section.stats}
              typeLabel={t("battleUi.breakdowns.headers.type")}
              valueLabel={t("battleUi.breakdowns.headers.value")}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
