import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import { formatDecimal, formatNumber } from "@lootlog/domain/locale";
import { ArticleSection } from "@/components/article/article-section";
import { t } from "@/i18n/messages";
import { formatPercent } from "@/lib/calculator-format";
import type { FighterSummary, FightSummary } from "@/lib/fight/fight-summary";
import { FightLengthChart } from "./fight-length-chart";
import {
  FightVersusTable,
  type VersusRow,
  type VersusSection,
} from "./fight-versus-table";

type FightResultsProps = {
  summary: FightSummary;
  notes: readonly string[];
};

const share = (rate: number) => formatPercent(Math.round(rate * 1000) / 10);

const decimal = (value: number) => formatDecimal(Math.round(value * 10) / 10);

const whole = (value: number) => formatNumber(Math.round(value));

const perMove = (value: number) => formatDecimal(Math.round(value * 100) / 100);

type RowSpec = {
  id: string;
  value: (fighter: FighterSummary, enemy: FighterSummary) => number;
  format: (value: number) => string;
  better?: VersusRow["better"];
  optional?: true;
};

const dealt = (enemy: FighterSummary) =>
  enemy.averageTaken.strike +
  enemy.averageTaken.skill +
  enemy.averageTaken.overTime;

const STAT_SECTIONS: readonly { id: string; rows: readonly RowSpec[] }[] = [
  {
    id: "outcome",
    rows: [
      {
        id: "survivalRate",
        value: (fighter) => fighter.survivalRate,
        format: share,
        better: "higher",
      },
      {
        id: "hpLeft",
        value: (fighter) => fighter.averageHpLeft,
        format: share,
        better: "higher",
      },
      {
        id: "healed",
        value: (fighter) => fighter.averageHealed,
        format: whole,
        better: "higher",
        optional: true,
      },
    ],
  },
  {
    id: "damage",
    rows: [
      {
        id: "damageStrike",
        value: (_, enemy) => enemy.averageTaken.strike,
        format: whole,
        better: "higher",
      },
      {
        id: "damageSkill",
        value: (_, enemy) => enemy.averageTaken.skill,
        format: whole,
        better: "higher",
        optional: true,
      },
      {
        id: "damageOverTime",
        value: (_, enemy) => enemy.averageTaken.overTime,
        format: whole,
        better: "higher",
        optional: true,
      },
      {
        id: "damageTotal",
        value: (_, enemy) => dealt(enemy),
        format: whole,
        better: "higher",
      },
      {
        id: "damagePerMove",
        value: (fighter, enemy) =>
          dealt(enemy) / Math.max(1, fighter.averageMoves),
        format: whole,
        better: "higher",
      },
    ],
  },
  {
    id: "strikes",
    rows: [
      {
        id: "strikes",
        value: (fighter) => fighter.averageStrikes,
        format: decimal,
      },
      {
        id: "critRate",
        value: (fighter) => fighter.critRate,
        format: share,
        better: "higher",
      },
      {
        id: "pierceRate",
        value: (fighter) => fighter.pierceRate,
        format: share,
        better: "higher",
        optional: true,
      },
      {
        id: "evadedRate",
        value: (fighter) => fighter.evadedRate,
        format: share,
        better: "lower",
      },
      {
        id: "blockedRate",
        value: (fighter) => fighter.blockedRate,
        format: share,
        better: "lower",
        optional: true,
      },
      {
        id: "parriedRate",
        value: (fighter) => fighter.parriedRate,
        format: share,
        better: "lower",
        optional: true,
      },
      {
        id: "counteredRate",
        value: (fighter) => fighter.counteredRate,
        format: share,
        better: "lower",
        optional: true,
      },
      {
        id: "stunRate",
        value: (fighter) => fighter.stunRate,
        format: share,
        better: "higher",
        optional: true,
      },
    ],
  },
  {
    id: "turns",
    rows: [
      {
        id: "moves",
        value: (fighter) => fighter.averageMoves,
        format: decimal,
      },
      {
        id: "casts",
        value: (fighter) => fighter.averageCasts,
        format: decimal,
        optional: true,
      },
      {
        id: "lostTurns",
        value: (fighter) => fighter.averageLostTurns,
        format: decimal,
        better: "lower",
        optional: true,
      },
    ],
  },
];

const statSections = (
  mine: FighterSummary,
  theirs: FighterSummary,
): VersusSection[] => {
  const skills = [
    ...new Set([
      ...mine.skillUsesPerMove.keys(),
      ...theirs.skillUsesPerMove.keys(),
    ]),
  ];

  return [
    ...STAT_SECTIONS.map((section) => ({
      id: section.id,
      title: t(`fightPage.statSections.${section.id}`),
      rows: section.rows.flatMap((row) => {
        const own = row.value(mine, theirs);
        const other = row.value(theirs, mine);

        return row.optional && own === 0 && other === 0
          ? []
          : [
              {
                id: row.id,
                label: t(`fightPage.stats.${row.id}`),
                mine: { value: own, text: row.format(own) },
                theirs: { value: other, text: row.format(other) },
                better: row.better,
              },
            ];
      }),
    })),
    {
      id: "skills",
      title: t("fightPage.statSections.skills"),
      rows: skills.map((skill) => {
        const own = mine.skillUsesPerMove.get(skill) ?? 0;
        const other = theirs.skillUsesPerMove.get(skill) ?? 0;

        return {
          id: skill,
          label: skill,
          mine: { value: own, text: own > 0 ? perMove(own) : "–" },
          theirs: { value: other, text: other > 0 ? perMove(other) : "–" },
        };
      }),
    },
  ];
};

const hpOnWin = (fighter: FighterSummary | undefined) =>
  fighter?.averageHpLeftOnWin === null || fighter === undefined
    ? t("fightPage.noWins")
    : share(fighter.averageHpLeftOnWin);

export function FightResults({ summary, notes }: FightResultsProps) {
  const [mine, theirs] = summary.fighters;

  return (
    <div className="flex flex-col gap-6">
      <div className="@container">
        <StatsTileGrid
          framed
          className="grid-cols-2 @xl:grid-cols-3 @6xl:grid-cols-6"
        >
          <StatsTile
            label={t("fightPage.winRate")}
            value={share(summary.winRate[0] ?? 0)}
            detail={t("fightPage.winRateDetail", {
              margin: share(summary.winRateMargin[0] ?? 0),
            })}
          />
          <StatsTile
            label={t("fightPage.lossRate")}
            value={share(summary.winRate[1] ?? 0)}
            detail={t("fightPage.lossRateDetail", {
              runs: formatNumber(summary.runs),
            })}
          />
          <StatsTile
            label={t("fightPage.drawRate")}
            value={share(summary.drawRate)}
            detail={t("fightPage.drawRateDetail")}
          />
          <StatsTile
            label={t("fightPage.averageMoves")}
            value={decimal(summary.averageMoves)}
            detail={t("fightPage.averageMovesDetail", {
              median: formatNumber(summary.moves.median),
              p10: formatNumber(summary.moves.p10),
              p90: formatNumber(summary.moves.p90),
            })}
          />
          <StatsTile
            label={t("fightPage.hpLeft")}
            value={share(mine?.averageHpLeft ?? 0)}
            detail={t("fightPage.hpLeftDetail", { won: hpOnWin(mine) })}
          />
          <StatsTile
            label={t("fightPage.opponentHpLeft")}
            value={share(theirs?.averageHpLeft ?? 0)}
            detail={t("fightPage.opponentHpLeftDetail", {
              won: hpOnWin(theirs),
            })}
          />
        </StatsTileGrid>
      </div>
      <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <div className="@container">
        <div className="grid items-start gap-6 @3xl:grid-cols-2">
          {mine && theirs ? (
            <ArticleSection
              id="fight-stats"
              title={t("fightPage.statsTitle")}
              description={t("fightPage.statsDescription")}
            >
              <FightVersusTable
                caption={t("fightPage.statsTitle")}
                sections={statSections(mine, theirs)}
              />
            </ArticleSection>
          ) : null}
          <ArticleSection
            id="fight-lengths"
            title={t("fightPage.lengthTitle")}
            description={t("fightPage.lengthDescription")}
          >
            <FightLengthChart summary={summary} />
          </ArticleSection>
        </div>
      </div>
    </div>
  );
}
