import { t } from "@/i18n/messages";
import { characterStats } from "@/lib/character-stats";
import { CHARACTER_STAT_SECTIONS } from "@/lib/character-stat-lines";
import type { Profession } from "@/lib/equipment-set";
import type { SkillBonuses } from "@/lib/skills/skill-stats";
import { skillPlanLevel } from "@/lib/skills/skill-tree";
import { EquipmentStatGrid } from "./equipment-stat-grid";
import { EquipmentStatRow } from "./equipment-stat-row";
import { EquipmentStatSection } from "./equipment-stat-section";

type CharacterStatsWindowProps = {
  profession: Profession;
  level: number | null;
  wornItems: ReadonlyArray<{ item: { type: string | null; stat: string } }>;
  skills: SkillBonuses;
  isLoaded: boolean;
};

const rounded = (value: number) => Math.round(value * 100) / 100;

export function CharacterStatsWindow({
  profession,
  level,
  wornItems,
  skills,
  isLoaded,
}: CharacterStatsWindowProps) {
  const stats = characterStats(
    profession,
    skillPlanLevel(level),
    wornItems,
    skills,
  );

  return (
    <EquipmentStatGrid
      caption={
        level === null
          ? `${t("character.hint")} ${t("character.assumedLevel")}`
          : t("character.hint")
      }
    >
      {CHARACTER_STAT_SECTIONS.map((section) => (
        <EquipmentStatSection
          key={section.id}
          id={`character-stats-${section.id}`}
          title={t(`setStats.sections.${section.id}`)}
          hidden={false}
        >
          {section.lines.map((line) => {
            const value = rounded(line.value(stats));
            const max = line.max ? rounded(line.max(stats)) : undefined;
            const isShown = line.always || value !== 0 || (max ?? 0) !== 0;

            return (
              <EquipmentStatRow
                key={line.id}
                label={t(`character.stats.${line.id}`)}
                unit={line.unit ?? ""}
                total={isShown ? value : undefined}
                rangeMax={max === undefined || max === value ? undefined : max}
                isLoaded={isLoaded}
              />
            );
          })}
        </EquipmentStatSection>
      ))}
    </EquipmentStatGrid>
  );
}
