import { cn } from "cn";
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
import { EquipmentStatRow } from "./equipment-stat-row";
import { EquipmentStatSection } from "./equipment-stat-section";

type EquipmentSetTotalsProps = {
  totals: StatTotals;
  /**
   * What learned skills add, at the character's level; without it the
   * window shows the items alone.
   */
  skills?: { bonuses: SkillBonuses; level: number | null };
  /** Whether the set has loaded, so a change of its totals is the User's. */
  isLoaded: boolean;
  /** `columns` sets the sections side by side, for a wide window. */
  layout?: "stack" | "columns";
};

/**
 * The set's stats added up as the game's character window lists them, by
 * section, with the change the User's last edit of the set made. Every stat
 * keeps a row that opens when the set has it.
 */
export function EquipmentSetTotals({
  totals,
  skills,
  isLoaded,
  layout = "stack",
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
    <div
      className={cn(
        layout === "columns"
          ? "grid items-start gap-x-8 gap-y-5 @lg:grid-cols-2 @[54rem]:grid-cols-4"
          : "flex flex-col gap-3",
      )}
    >
      <p
        className={cn(
          layout === "columns" && "col-span-full",
          "text-xs text-pretty text-muted-foreground",
        )}
      >
        {caption}
      </p>
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
    </div>
  );
}
