import { formatDecimal, formatNumber } from "@lootlog/domain/locale";
import { t } from "@/i18n/messages";
import { formatPercent } from "@/lib/calculator-format";
import type { FighterSummary } from "@/lib/fight/fight-summary";

export type FightStatRow = {
  id: string;
  label: string;
  values: readonly [number, number];
  format: (value: number) => string;
  scale: "share" | "relative";
  better?: "higher" | "lower";
};

export type FightStatSectionId =
  | "outcome"
  | "damage"
  | "strikes"
  | "turns"
  | "skills";

export const formatShare = (rate: number) =>
  formatPercent(Math.round(rate * 1000) / 10);

export const formatTenths = (value: number) =>
  formatDecimal(Math.round(value * 10) / 10);

const whole = (value: number) => formatNumber(Math.round(value));

const perMove = (value: number) =>
  value > 0 ? formatDecimal(Math.round(value * 100) / 100) : "–";

type RowSpec = Pick<FightStatRow, "format" | "scale" | "better"> & {
  id: string;
  value: (fighter: FighterSummary, enemy: FighterSummary) => number;
  optional?: true;
};

const dealt = (enemy: FighterSummary) =>
  enemy.averageTaken.strike +
  enemy.averageTaken.skill +
  enemy.averageTaken.overTime;

const share = { format: formatShare, scale: "share" } as const;

const amount = { format: whole, scale: "relative" } as const;

const count = { format: formatTenths, scale: "relative" } as const;

const SPECS: Record<
  Exclude<FightStatSectionId, "skills">,
  readonly RowSpec[]
> = {
  outcome: [
    {
      id: "survivalRate",
      value: (fighter) => fighter.survivalRate,
      ...share,
      better: "higher",
    },
    {
      id: "hpLeft",
      value: (fighter) => fighter.averageHpLeft,
      ...share,
      better: "higher",
    },
    {
      id: "hpLeftOnWin",
      value: (fighter) => fighter.averageHpLeftOnWin ?? 0,
      ...share,
      better: "higher",
    },
    {
      id: "healed",
      value: (fighter) => fighter.averageHealed,
      ...amount,
      better: "higher",
      optional: true,
    },
  ],
  damage: [
    {
      id: "damageTotal",
      value: (_, enemy) => dealt(enemy),
      ...amount,
      better: "higher",
    },
    {
      id: "damagePerMove",
      value: (fighter, enemy) =>
        dealt(enemy) / Math.max(1, fighter.averageMoves),
      ...amount,
      better: "higher",
    },
    {
      id: "damageStrike",
      value: (_, enemy) => enemy.averageTaken.strike,
      ...amount,
      better: "higher",
    },
    {
      id: "damageSkill",
      value: (_, enemy) => enemy.averageTaken.skill,
      ...amount,
      better: "higher",
      optional: true,
    },
    {
      id: "damageOverTime",
      value: (_, enemy) => enemy.averageTaken.overTime,
      ...amount,
      better: "higher",
      optional: true,
    },
  ],
  strikes: [
    {
      id: "critRate",
      value: (fighter) => fighter.critRate,
      ...share,
      better: "higher",
    },
    {
      id: "pierceRate",
      value: (fighter) => fighter.pierceRate,
      ...share,
      better: "higher",
      optional: true,
    },
    {
      id: "stunRate",
      value: (fighter) => fighter.stunRate,
      ...share,
      better: "higher",
      optional: true,
    },
    {
      id: "evadedRate",
      value: (fighter) => fighter.evadedRate,
      ...share,
      better: "lower",
    },
    {
      id: "blockedRate",
      value: (fighter) => fighter.blockedRate,
      ...share,
      better: "lower",
      optional: true,
    },
    {
      id: "parriedRate",
      value: (fighter) => fighter.parriedRate,
      ...share,
      better: "lower",
      optional: true,
    },
    {
      id: "counteredRate",
      value: (fighter) => fighter.counteredRate,
      ...share,
      better: "lower",
      optional: true,
    },
  ],
  turns: [
    { id: "moves", value: (fighter) => fighter.averageMoves, ...count },
    { id: "strikes", value: (fighter) => fighter.averageStrikes, ...count },
    {
      id: "casts",
      value: (fighter) => fighter.averageCasts,
      ...count,
      optional: true,
    },
    {
      id: "lostTurns",
      value: (fighter) => fighter.averageLostTurns,
      ...count,
      better: "lower",
      optional: true,
    },
  ],
};

const skillRows = (
  mine: FighterSummary,
  theirs: FighterSummary,
): FightStatRow[] =>
  [
    ...new Set([
      ...mine.skillUsesPerMove.keys(),
      ...theirs.skillUsesPerMove.keys(),
    ]),
  ].map((skill) => ({
    id: skill,
    label: skill,
    values: [
      mine.skillUsesPerMove.get(skill) ?? 0,
      theirs.skillUsesPerMove.get(skill) ?? 0,
    ],
    format: perMove,
    scale: "relative",
  }));

export const fightStatRows = (
  section: FightStatSectionId,
  mine: FighterSummary,
  theirs: FighterSummary,
): FightStatRow[] =>
  section === "skills"
    ? skillRows(mine, theirs)
    : SPECS[section].flatMap(({ value, optional, id, ...row }) => {
        const values = [value(mine, theirs), value(theirs, mine)] as const;

        return optional && values[0] === 0 && values[1] === 0
          ? []
          : [{ ...row, id, label: t(`fightPage.stats.${id}`), values }];
      });
