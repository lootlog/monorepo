import { z } from "zod";
import type { BattleTimelineResponseDtoOutputTimelineItem } from "@lootlog/client/battlelog";

export type BattleHpTimelineTooltipDeltaKey =
  | "damage"
  | "healing"
  | "mitigation";

export type BattleHpTimelineTooltipDelta = {
  key: BattleHpTimelineTooltipDeltaKey;
  labelKey: string;
  value: number;
};

export type BattleHpTimelineTooltipLegendaryBonus = {
  labelKey: string;
  recipientName: string | null;
  team: number;
  color: string;
};

export type BattleHpTimelineTooltipData = {
  turn: number;
  team1: number;
  team2: number;
  momentum: number;
  deltas: BattleHpTimelineTooltipDelta[];
  legendaryBonuses: BattleHpTimelineTooltipLegendaryBonus[];
  flagLabelKeys: string[];
};

type BattleHpTimelineTooltipLegendaryGroup = {
  turn: number;
  team: number;
  bonuses: {
    labelKey: string;
    recipientName: string | null;
    color: string;
  }[];
};

type BattleHpTimelineTooltipTurn = Pick<
  BattleTimelineResponseDtoOutputTimelineItem,
  "deltas" | "flags" | "teamHp" | "turn"
>;

const KNOWN_FLAG_KEYS = [
  "kill",
  "flee",
  "stun",
  "freeze",
  "block",
  "evade",
  "counter",
  "parry",
  "arrowBlock",
  "pierceBlock",
  "absorb",
  "ph",
  "damage",
  "healing",
  "activeHealing",
  "resource",
  "combo",
  "effectDamage",
] as const;

const knownFlagKeys = new Set<string>(KNOWN_FLAG_KEYS);

const getRoundedTooltipNumber = (value: number) =>
  Math.round(Number(value.toFixed(6)) * 10) / 10;

export const formatBattleHpTimelineTooltipNumber = (
  value: number,
  locale = "pl-PL",
) =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(getRoundedTooltipNumber(value));

const tooltipDelta = z.object({
  key: z.enum(["damage", "healing", "mitigation"]),
  labelKey: z.string(),
  value: z.number(),
});

const tooltipLegendaryBonus = z.object({
  labelKey: z.string(),
  recipientName: z.string().nullable(),
  team: z.number(),
  color: z.string(),
});

const tooltipPayload = z
  .object({
    turn: z.coerce.number(),
    team1: z.coerce.number(),
    team2: z.coerce.number(),
    momentum: z.coerce.number().optional(),
    deltas: z
      .array(tooltipDelta.nullable().catch(null))
      .catch([])
      .transform((values) => values.filter((value) => value !== null)),
    legendaryBonuses: z
      .array(tooltipLegendaryBonus.nullable().catch(null))
      .catch([])
      .transform((values) => values.filter((value) => value !== null)),
    flagLabelKeys: z
      .array(z.string().nullable().catch(null))
      .catch([])
      .transform((values) => values.filter((value) => value !== null)),
  })
  .transform((payload): BattleHpTimelineTooltipData => ({
    ...payload,
    momentum: payload.momentum ?? payload.team1 - payload.team2,
  }));

export const getBattleHpTimelineTooltipPayload = tooltipPayload
  .nullable()
  .catch(null).parse;

export const buildBattleHpTimelineTooltipData = (
  turn: BattleHpTimelineTooltipTurn,
  legendaryBonuses: BattleHpTimelineTooltipLegendaryBonus[] = [],
): BattleHpTimelineTooltipData => {
  const team1 = turn.teamHp["1"] ?? 0;
  const team2 = turn.teamHp["2"] ?? 0;

  return {
    turn: turn.turn,
    team1,
    team2,
    momentum: getRoundedTooltipNumber(team1 - team2),
    deltas: getBattleHpTimelineTooltipDeltas(turn),
    legendaryBonuses,
    flagLabelKeys: turn.flags
      .map(getKnownFlagLabelKey)
      .filter((value): value is string => value !== undefined),
  };
};

export const buildBattleHpTimelineTooltipLegendaryBonusesByTurn = (
  groups: BattleHpTimelineTooltipLegendaryGroup[],
) => {
  const legendaryBonusesByTurn = new Map<
    number,
    BattleHpTimelineTooltipLegendaryBonus[]
  >();

  for (const group of groups) {
    const turnBonuses = legendaryBonusesByTurn.get(group.turn) ?? [];

    for (const bonus of group.bonuses) {
      turnBonuses.push({
        labelKey: bonus.labelKey,
        recipientName: bonus.recipientName,
        team: group.team,
        color: bonus.color,
      });
    }

    legendaryBonusesByTurn.set(group.turn, turnBonuses);
  }

  return legendaryBonusesByTurn;
};

const getBattleHpTimelineTooltipDeltas = (
  turn: BattleHpTimelineTooltipTurn,
): BattleHpTimelineTooltipDelta[] => {
  const deltas: BattleHpTimelineTooltipDelta[] = [
    {
      key: "damage",
      labelKey: "battlePanel.single.chart.tooltip.damage",
      value: turn.deltas.damage,
    },
    {
      key: "healing",
      labelKey: "battlePanel.single.chart.tooltip.healing",
      value: turn.deltas.healing,
    },
    {
      key: "mitigation",
      labelKey: "battlePanel.single.chart.tooltip.mitigation",
      value: turn.deltas.mitigation,
    },
  ];

  return deltas.filter((delta) => delta.value !== 0);
};

const getKnownFlagLabelKey = (flag: string) => {
  if (!knownFlagKeys.has(flag)) {
    return undefined;
  }

  return `battlePanel.single.flags.${flag}`;
};
