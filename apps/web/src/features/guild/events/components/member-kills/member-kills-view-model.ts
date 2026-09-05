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

export const formatPercentage = (value: number) => `${formatPoints(value)}%`;

export const getMemberKillScoringViewModel = (
  kill: EventMemberKill,
  t: TFunction,
) => {
  const point = kill.memberPoint;
  const scoring = getScoringBreakdown({
    points: point?.points ?? 0,
    basePoints: point?.basePoints ?? 0,
    manualAdjustmentPoints: point?.manualAdjustmentPoints ?? 0,
    bonusBreakdown: point?.bonusBreakdown,
  });

  return {
    point,
    hasManualPointsAdjustment: scoring.manualAdjustmentPoints !== 0,
    trackingPercentage:
      typeof point?.trackingDurationPercentage === "number"
        ? `${Math.round(point.trackingDurationPercentage)}%`
        : "-",
    trackingTime:
      typeof point?.trackingDurationSeconds === "number" &&
      point.trackingDurationSeconds >= 0
        ? formatDurationHuman(point.trackingDurationSeconds)
        : "-",
    scoringItems: getScoringItems({ ...scoring, t, formatPoints }),
  };
};
import type { TFunction } from "i18next";
import type { EventMemberKill } from "../../hooks/queries/use-event-member-kill-history";
import { formatDurationHuman } from "../../utils/format-duration";
import {
  getScoringBreakdown,
  getScoringItems,
} from "../../utils/scoring-presentation";
