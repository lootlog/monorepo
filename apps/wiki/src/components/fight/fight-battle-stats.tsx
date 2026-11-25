import { useTranslation } from "react-i18next";
import { comparePolish, formatNumber } from "@lootlog/domain/locale";
import {
  STAT_CATEGORIES,
  type BattleStatDefinition,
} from "@lootlog/battle-ui/lib/battle-stat-definitions";
import type { BattleWarrior } from "@lootlog/battle-ui/lib/battle-types";
import { t as wikiT } from "@/i18n/messages";
import { FightVersusTable, type VersusSection } from "./fight-versus-table";

const statCell = (warrior: BattleWarrior, stat: BattleStatDefinition) => {
  const value = warrior[stat.key];

  return {
    value,
    text: stat.format ? stat.format(value) : formatNumber(value),
  };
};

const skillUses = (mine: BattleWarrior, theirs: BattleWarrior) =>
  [
    ...new Set([
      ...Object.keys(mine.spellsUsedMap),
      ...Object.keys(theirs.spellsUsedMap),
    ]),
  ]
    .sort(comparePolish)
    .map((name) => {
      const own = mine.spellsUsedMap[name] ?? 0;
      const other = theirs.spellsUsedMap[name] ?? 0;

      return {
        id: `skill-${name}`,
        label: name,
        mine: { value: own, text: formatNumber(own) },
        theirs: { value: other, text: formatNumber(other) },
        better: "higher" as const,
      };
    });

export function FightBattleStats({
  mine,
  theirs,
}: {
  mine: BattleWarrior;
  theirs: BattleWarrior;
}) {
  const { t } = useTranslation();

  const sections: VersusSection[] = [
    ...STAT_CATEGORIES.map((category) => ({
      id: category.id,
      title: t(category.labelKey),
      rows: category.stats.flatMap((stat) => {
        const own = statCell(mine, stat);
        const other = statCell(theirs, stat);

        return own.value === 0 && other.value === 0
          ? []
          : [
              {
                id: String(stat.key),
                label: t(stat.labelKey),
                mine: own,
                theirs: other,
              },
            ];
      }),
    })),
    {
      id: "skills",
      title: wikiT("fightPage.skillUsesTitle"),
      rows: skillUses(mine, theirs),
    },
  ];

  return (
    <FightVersusTable
      caption={wikiT("fightPage.battleStatsCaption")}
      sections={sections}
    />
  );
}
