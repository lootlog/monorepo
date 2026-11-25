import { formatDecimal } from "@lootlog/domain/locale";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { SectionCardContent } from "@lootlog/ui/components/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { EmptyNotice } from "@/components/common/empty-notice";
import { t } from "@/i18n/messages";
import { CHARACTER_STAT_SECTIONS } from "@/lib/character-stat-lines";
import type { CharacterStats } from "@/lib/character-stats";
import type { FighterProfile } from "@/lib/fight/fighter-profile";
import { FightVersusTable, type VersusSection } from "./fight-versus-table";

const rounded = (value: number) => Math.round(value * 100) / 100;

const statCell = (
  stats: CharacterStats,
  line: (typeof CHARACTER_STAT_SECTIONS)[number]["lines"][number],
) => {
  const value = rounded(line.value(stats));
  const max = line.max ? rounded(line.max(stats)) : value;
  const unit = line.unit ?? "";

  return {
    value: (value + max) / 2,
    text:
      max === value
        ? `${formatDecimal(value)}${unit}`
        : `${formatDecimal(value)}–${formatDecimal(max)}${unit}`,
  };
};

const statSections = (
  mine: CharacterStats,
  theirs: CharacterStats,
): VersusSection[] =>
  CHARACTER_STAT_SECTIONS.map((section) => ({
    id: section.id,
    title: t(`setStats.sections.${section.id}`),
    rows: section.lines.flatMap((line) => {
      const own = statCell(mine, line);
      const other = statCell(theirs, line);

      return line.always || own.value !== 0 || other.value !== 0
        ? [
            {
              id: line.id,
              label: t(`character.stats.${line.id}`),
              mine: own,
              theirs: other,
              better: "higher" as const,
            },
          ]
        : [];
    }),
  }));

export function FightCharacterStats({
  mine,
  opponent,
}: {
  mine: FighterProfile | null;
  opponent: FighterProfile | null;
}) {
  return (
    <SectionCard aria-labelledby="fight-character-stats">
      <SectionCardHeader
        id="fight-character-stats"
        title={t("fightPage.characterStatsTitle")}
      />
      <SectionCardContent>
        {mine && opponent ? (
          <FightVersusTable
            caption={t("fightPage.characterStatsTitle")}
            sections={statSections(mine.stats, opponent.stats)}
          />
        ) : (
          <EmptyNotice>{t("fightPage.missingProfession")}</EmptyNotice>
        )}
      </SectionCardContent>
    </SectionCard>
  );
}
