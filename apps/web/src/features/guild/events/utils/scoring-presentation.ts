import { formatPoints } from "./format-points";
import type { TOptions } from "i18next";
import { normalizeBonusBreakdown } from "./normalize-bonus-breakdown";
import { SCORING_TONE_TEXT_CLASS } from "./scoring-tone";

export const getScoringBreakdown = ({
  points,
  basePoints,
  manualAdjustmentPoints: rawManualAdjustmentPoints,
  bonusBreakdown: rawBonusBreakdown,
}: {
  points: number;
  basePoints: number;
  manualAdjustmentPoints?: number | null;
  bonusBreakdown?: unknown;
}) => {
  const manualAdjustmentPoints = rawManualAdjustmentPoints ?? 0;
  const bonusBreakdown = normalizeBonusBreakdown(rawBonusBreakdown);
  const autoTotalPoints = points - manualAdjustmentPoints;

  const fallbackBonusPoints =
    Math.round(Math.max(0, autoTotalPoints - basePoints) * 10_000) / 10_000;

  const bonusPoints =
    bonusBreakdown.length > 0
      ? Math.round(
          bonusBreakdown.reduce((sum, item) => sum + item.points, 0) * 10_000,
        ) / 10_000
      : fallbackBonusPoints;

  const capReduction = Math.max(0, basePoints + bonusPoints - autoTotalPoints);

  return {
    basePoints,
    bonusBreakdown,
    bonusPoints,
    capReduction,
    manualAdjustmentPoints,
  };
};

export const getScoringItems = ({
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
  t: (key: string, options?: TOptions) => string;
}) => {
  const items = [
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
      valueClassName: SCORING_TONE_TEXT_CLASS.bonus,
    });
  }

  if (bonusBreakdown.length === 0 && bonusPoints > 0) {
    items.push({
      label: t("events.kills.pointsTooltip.bonusTotal"),
      value: `+${formatPoints(bonusPoints)}`,
      valueClassName: SCORING_TONE_TEXT_CLASS.bonus,
    });
  }

  if (capReduction > 0) {
    items.push({
      label: t("events.kills.pointsTooltip.capReduction"),
      value: `-${formatPoints(capReduction)}`,
      valueClassName: SCORING_TONE_TEXT_CLASS.adjusted,
    });
  }

  if (manualAdjustmentPoints !== 0) {
    items.push({
      label: t("events.kills.pointsTooltip.manualAdjustment"),
      value:
        manualAdjustmentPoints > 0
          ? `+${formatPoints(manualAdjustmentPoints)}`
          : formatPoints(manualAdjustmentPoints),
      valueClassName: SCORING_TONE_TEXT_CLASS.adjusted,
    });
  }

  return items;
};
