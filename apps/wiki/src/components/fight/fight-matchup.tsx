import { BATTLE_TEXT_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
import { formatDecimal } from "@lootlog/domain/locale";
import { EmptyNotice } from "@/components/common/empty-notice";
import { EquipmentSetEditor } from "@/components/equipment/equipment-set-editor";
import { t } from "@/i18n/messages";
import { CHARACTER_STAT_SECTIONS } from "@/lib/character-stat-lines";
import type { CharacterStats } from "@/lib/character-stats";
import type { EquipmentSet } from "@/lib/equipment-set";
import type { FighterProfile } from "@/lib/fight/fighter-profile";
import { FightMatchupSide } from "./fight-matchup-side";
import { FightVersusTable, type VersusSection } from "./fight-versus-table";

type FightMatchupProps = {
  mine: FighterProfile | null;
  opponent: FighterProfile | null;
  opponentSet: EquipmentSet;
  updateOpponent: (update: (set: EquipmentSet) => EquipmentSet) => void;
  onEdit: (side: "mine" | "opponent") => void;
};

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

export function FightMatchup({
  mine,
  opponent,
  opponentSet,
  updateOpponent,
  onEdit,
}: FightMatchupProps) {
  return (
    <section
      aria-labelledby="fight-matchup"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3"
    >
      <h2 id="fight-matchup" className="text-sm font-semibold">
        {t("fightPage.matchupTitle")}
      </h2>
      <div className="flex flex-col gap-2">
        <FightMatchupSide
          name={t("fightPage.myName")}
          nameClassName={BATTLE_TEXT_COLORS.team.friendly}
          onEdit={() => onEdit("mine")}
        />
        <EquipmentSetEditor set={opponentSet} update={updateOpponent}>
          <FightMatchupSide
            name={t("fightPage.opponentName")}
            nameClassName={BATTLE_TEXT_COLORS.team.enemy}
            onEdit={() => onEdit("opponent")}
          />
        </EquipmentSetEditor>
      </div>
      {mine && opponent ? (
        <FightVersusTable
          caption={t("fightPage.matchupTitle")}
          sections={statSections(mine.stats, opponent.stats)}
        />
      ) : (
        <EmptyNotice>{t("fightPage.missingProfession")}</EmptyNotice>
      )}
    </section>
  );
}
