import { t } from "@/i18n/messages";
import {
  SET_STAT_SECTIONS,
  type SetStatDefinition,
  setStatValue,
  type StatTotals,
} from "@/lib/item-stat-totals";
import {
  SKILL_STATS,
  type SkillBonuses,
  skillStatValue,
  setStatValueWithSkills,
} from "@/lib/skills/skill-stats";
import { EquipmentStatGrid } from "./equipment-stat-grid";
import { EquipmentStatRow } from "./equipment-stat-row";
import { EquipmentStatSection } from "./equipment-stat-section";

type EquipmentSetTotalsProps = {
  totals: StatTotals;
  skills?: { bonuses: SkillBonuses; level: number | null };
  isLoaded: boolean;
};

export function EquipmentSetTotals({
  totals,
  skills,
  isLoaded,
}: EquipmentSetTotalsProps) {
  const valueOf = (stat: SetStatDefinition) =>
    skills
      ? setStatValueWithSkills(totals, stat, skills.bonuses, skills.level)
      : setStatValue(totals, stat);

  const hasValue = (stat: SetStatDefinition) => valueOf(stat) !== undefined;

  const skillRows = SKILL_STATS.map((stat) => ({
    stat,
    total: skills ? skillStatValue(skills.bonuses, stat) : undefined,
  }));

  const hasSkillStats = skillRows.some(({ total }) => total !== undefined);

  const hasTotals =
    hasSkillStats ||
    SET_STAT_SECTIONS.some(({ stats }) => stats.some(hasValue));

  const caption = hasTotals ? t("equipment.totalsHint") : t("equipment.empty");

  return (
    <EquipmentStatGrid caption={caption}>
      {SET_STAT_SECTIONS.map((section) => {
        const isShown = section.stats.some(hasValue);

        return (
          <EquipmentStatSection
            key={section.id}
            id={`set-stats-${section.id}`}
            title={t(`setStats.sections.${section.id}`)}
            hidden={!isShown}
          >
            {section.stats.map((stat) => (
              <EquipmentStatRow
                key={stat.id}
                label={t(`setStats.stats.${stat.id}`)}
                unit={"unit" in stat ? stat.unit : ""}
                total={valueOf(stat)}
                isLoaded={isLoaded}
              />
            ))}
          </EquipmentStatSection>
        );
      })}
      <EquipmentStatSection
        id="set-stats-skills"
        title={t("setStats.sections.skills")}
        hidden={!hasSkillStats}
      >
        {skillRows.map(({ stat, total }) => (
          <EquipmentStatRow
            key={stat.id}
            label={t(`setStats.skillStats.${stat.id}`)}
            unit={stat.unit ?? ""}
            total={total}
            isLoaded={isLoaded}
          />
        ))}
      </EquipmentStatSection>
    </EquipmentStatGrid>
  );
}
