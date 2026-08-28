export type MemberStatsSummary = {
  totalKills: number;
  totalPoints: number;
  totalTimeSeconds: number;
  avgAfkPercentage: number;
  avgPointsPerKill: number;
  avgTimePerKillSeconds: number;
};

export type MemberIdentity = {
  avatar?: string | null;
  name: string;
  userId: string;
};

export const formatPoints = (value: number) => {
  const rounded = Math.round(value * 100) / 100;

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toFixed(2).replace(/\.?0+$/, "");
};

export const formatPercentage = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  const normalized = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/\.?0+$/, "");

  return `${normalized}%`;
};

type ScoringItem = {
  label: string;
  value: string;
  valueClassName: string;
};

const getBonusPoints = (
  bonusBreakdown: ReturnType<typeof normalizeBonusBreakdown>,
  fallbackBonusPoints: number,
) =>
  bonusBreakdown.length > 0
    ? Math.round(
        bonusBreakdown.reduce((sum, item) => sum + item.points, 0) * 10_000,
      ) / 10_000
    : fallbackBonusPoints;

const getScoringItems = ({
  basePoints,
  bonusBreakdown,
  bonusPoints,
  capReduction,
  manualAdjustmentPoints,
  t,
}: {
  basePoints: number;
  bonusBreakdown: ReturnType<typeof normalizeBonusBreakdown>;
  bonusPoints: number;
  capReduction: number;
  manualAdjustmentPoints: number;
  t: TFunction;
}) => {
  const items: ScoringItem[] = [
    {
      label: t("events.kills.pointsTooltip.basePoints"),
      value: formatPoints(basePoints),
      valueClassName: "text-foreground",
    },
  ];

  for (const bonus of bonusBreakdown) {
    items.push({
      label: t("events.kills.pointsTooltip.bonusItem", {
        name: bonus.ruleName ?? t("events.kills.pointsTooltip.unnamedBonus"),
      }),
      value: `+${formatPoints(bonus.points)}`,
      valueClassName: "text-cyan-400",
    });
  }
  if (bonusBreakdown.length === 0 && bonusPoints > 0) {
    items.push({
      label: t("events.kills.pointsTooltip.bonusTotal"),
      value: `+${formatPoints(bonusPoints)}`,
      valueClassName: "text-cyan-400",
    });
  }
  if (capReduction > 0) {
    items.push({
      label: t("events.kills.pointsTooltip.capReduction"),
      value: `-${formatPoints(capReduction)}`,
      valueClassName: "text-amber-400",
    });
  }
  if (manualAdjustmentPoints !== 0) {
    items.push({
      label: t("events.kills.pointsTooltip.manualAdjustment"),
      value:
        manualAdjustmentPoints > 0
          ? `+${formatPoints(manualAdjustmentPoints)}`
          : formatPoints(manualAdjustmentPoints),
      valueClassName: "text-amber-400",
    });
  }
  return items;
};

export const getMemberKillScoringViewModel = (
  kill: EventMemberKill,
  t: TFunction,
) => {
  const point = kill.memberPoint;
  const basePoints = point?.basePoints ?? 0;
  const bonusBreakdown = normalizeBonusBreakdown(point?.bonusBreakdown);
  const manualAdjustmentPoints = point?.manualAdjustmentPoints ?? 0;
  const autoTotalPoints = (point?.points ?? 0) - manualAdjustmentPoints;
  const fallbackBonusPoints =
    Math.round(Math.max(0, autoTotalPoints - basePoints) * 10_000) / 10_000;
  const bonusPoints = getBonusPoints(bonusBreakdown, fallbackBonusPoints);
  const capReduction = Math.max(0, basePoints + bonusPoints - autoTotalPoints);

  return {
    point,
    hasManualPointsAdjustment: manualAdjustmentPoints !== 0,
    trackingPercentage:
      typeof point?.trackingDurationPercentage === "number"
        ? `${Math.round(point.trackingDurationPercentage)}%`
        : "—",
    trackingTime:
      typeof point?.trackingDurationSeconds === "number" &&
      point.trackingDurationSeconds >= 0
        ? formatDurationHuman(point.trackingDurationSeconds)
        : "—",
    scoringItems: getScoringItems({
      basePoints,
      bonusBreakdown,
      bonusPoints,
      capReduction,
      manualAdjustmentPoints,
      t,
    }),
  };
};
import type { TFunction } from "i18next";
import type { EventMemberKill } from "../../hooks/queries/use-event-member-kill-history";
import { formatDurationHuman } from "../../utils/format-duration";
import { normalizeBonusBreakdown } from "../../utils/normalize-bonus-breakdown";
