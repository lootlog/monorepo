import { SectionCard } from "@lootlog/ui/components/section-card";
import { SectionCardContent } from "@lootlog/ui/components/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { EmptyNotice } from "@/components/common/empty-notice";
import { t } from "@/i18n/messages";
import {
  CHARACTER_STAT_SECTIONS,
  formatCharacterStatLine,
} from "@/lib/character-stat-lines";
import type { CharacterStats } from "@/lib/character-stats";
import type { FighterProfile } from "@/lib/fight/fighter-profile";
import { FightVersusTable, type VersusSection } from "./fight-versus-table";

const statSections = (
  mine: CharacterStats,
  theirs: CharacterStats,
): VersusSection[] =>
  CHARACTER_STAT_SECTIONS.map((section) => ({
    id: section.id,
    title: t(`setStats.sections.${section.id}`),
    rows: section.lines.flatMap((line) => {
      const own = formatCharacterStatLine(mine, line);
      const other = formatCharacterStatLine(theirs, line);

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
