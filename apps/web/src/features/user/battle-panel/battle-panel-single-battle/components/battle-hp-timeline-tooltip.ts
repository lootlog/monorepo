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

export const getBattleHpTimelineTooltipPayload = (
  payload: unknown,
): BattleHpTimelineTooltipData | null => {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  if (!("turn" in payload) || !("team1" in payload) || !("team2" in payload)) {
    return null;
  }

  const turn = Number(payload.turn);
  const team1 = Number(payload.team1);
  const team2 = Number(payload.team2);
  const momentum = Number(
    "momentum" in payload ? payload.momentum : team1 - team2,
  );

  if (
    Number.isNaN(turn) ||
    Number.isNaN(team1) ||
    Number.isNaN(team2) ||
    Number.isNaN(momentum)
  ) {
    return null;
  }

  const deltas =
    "deltas" in payload && Array.isArray(payload.deltas)
      ? payload.deltas.filter(isTooltipDelta)
      : [];
  const flagLabelKeys =
    "flagLabelKeys" in payload && Array.isArray(payload.flagLabelKeys)
      ? payload.flagLabelKeys.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
  const legendaryBonuses =
    "legendaryBonuses" in payload && Array.isArray(payload.legendaryBonuses)
      ? payload.legendaryBonuses.filter(isTooltipLegendaryBonus)
      : [];

  return {
    turn,
    team1,
    team2,
    momentum,
    deltas,
    legendaryBonuses,
    flagLabelKeys,
  };
};

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

const isTooltipDelta = (
  value: unknown,
): value is BattleHpTimelineTooltipDelta =>
  typeof value === "object" &&
  value !== null &&
  "key" in value &&
  "labelKey" in value &&
  "value" in value &&
  typeof value.key === "string" &&
  typeof value.labelKey === "string" &&
  typeof value.value === "number";

const isTooltipLegendaryBonus = (
  value: unknown,
): value is BattleHpTimelineTooltipLegendaryBonus =>
  typeof value === "object" &&
  value !== null &&
  "labelKey" in value &&
  "recipientName" in value &&
  "team" in value &&
  "color" in value &&
  typeof value.labelKey === "string" &&
  (typeof value.recipientName === "string" || value.recipientName === null) &&
  typeof value.team === "number" &&
  typeof value.color === "string";
