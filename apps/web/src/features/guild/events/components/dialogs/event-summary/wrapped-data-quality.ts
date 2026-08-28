import type {
  EventWrapped,
  EventWrappedLeader,
  EventWrappedLeaderResult,
} from "../../../types/api";

export type WrappedOmissionReason =
  | "invalid-value"
  | "kill-source-mismatch"
  | "insufficient-candidates"
  | "non-positive-maximum"
  | "tied-winner"
  | "invalid-event-window"
  | "invalid-coverage";

export type WrappedLeaderFact = {
  leader: EventWrappedLeader;
  candidateCount: number;
};

export type WrappedQualityModel = {
  data: EventWrapped;
  killSourceConsistent: boolean;
  assignmentWindowValid: boolean;
  coverageValid: boolean;
  rarityItemCount: number;
  leaders: {
    topHunter: WrappedLeaderFact | null;
    topScorer: WrappedLeaderFact | null;
    longestDuty: WrappedLeaderFact | null;
  };
  dominantHero: EventWrapped["heroes"][number] | null;
  omissions: Array<{
    factId: string;
    reason: WrappedOmissionReason;
  }>;
};

const isFiniteNonNegative = (value: number): boolean =>
  Number.isFinite(value) && value >= 0;

const hasValidAssignmentWindow = (data: EventWrapped) => {
  const windowStart = data.event.startsAt
    ? Date.parse(data.event.startsAt)
    : Number.NaN;
  const windowEnd = Date.parse(data.event.endsAt ?? data.generatedAt);
  return (
    Number.isFinite(windowStart) &&
    Number.isFinite(windowEnd) &&
    windowEnd >= windowStart
  );
};

const getDominantHero = (data: EventWrapped, killSourceConsistent: boolean) => {
  const maximumHeroKills = Math.max(
    ...data.heroes.map((hero) => hero.totalKills),
    0,
  );
  const heroesWithMaximumKills = data.heroes.filter(
    (hero) => hero.totalKills === maximumHeroKills,
  );
  if (
    !killSourceConsistent ||
    data.heroes.length < 2 ||
    maximumHeroKills <= 0 ||
    heroesWithMaximumKills.length !== 1
  ) {
    return null;
  }
  return heroesWithMaximumKills[0] ?? null;
};

const validateLeader = ({
  factId,
  result,
  sourceConsistent = true,
  omissions,
}: {
  factId: string;
  result: EventWrappedLeaderResult;
  sourceConsistent?: boolean;
  omissions: WrappedQualityModel["omissions"];
}): WrappedLeaderFact | null => {
  if (!sourceConsistent) {
    omissions.push({ factId, reason: "kill-source-mismatch" });
    return null;
  }

  if (result.candidateCount < 2) {
    omissions.push({ factId, reason: "insufficient-candidates" });
    return null;
  }

  if (!result.winner) {
    omissions.push({
      factId,
      reason:
        result.tiedWinnerCount > 1 ? "tied-winner" : "non-positive-maximum",
    });
    return null;
  }

  if (
    !isFiniteNonNegative(result.winner.primaryValue) ||
    result.winner.primaryValue === 0
  ) {
    omissions.push({ factId, reason: "invalid-value" });
    return null;
  }

  return {
    leader: result.winner,
    candidateCount: result.candidateCount,
  };
};

export const buildWrappedQualityModel = (
  data: EventWrapped,
): WrappedQualityModel => {
  const omissions: WrappedQualityModel["omissions"] = [];
  const rankedKillTotal = data.heroes.reduce(
    (total, hero) =>
      total + (isFiniteNonNegative(hero.totalKills) ? hero.totalKills : 0),
    0,
  );
  const killSourceConsistent =
    isFiniteNonNegative(data.overview.totalKills) &&
    rankedKillTotal === data.overview.totalKills;

  if (!killSourceConsistent) {
    omissions.push({
      factId: "kill-derived-facts",
      reason: "kill-source-mismatch",
    });
  }

  const assignmentWindowValid = hasValidAssignmentWindow(data);

  if (!assignmentWindowValid) {
    omissions.push({
      factId: "longest-duty",
      reason: "invalid-event-window",
    });
  }

  const coverageValues = [
    data.coverage.totalWindowCount,
    data.coverage.totalWindowSeconds,
    data.coverage.totalCoverageSeconds,
    data.coverage.totalUncoveredSeconds,
    data.coverage.totalUnassignedSeconds,
    data.coverage.coveragePercentage,
  ];
  const coverageValid =
    coverageValues.every(isFiniteNonNegative) &&
    data.coverage.totalWindowCount > 0 &&
    data.coverage.totalWindowSeconds > 0 &&
    data.coverage.coveragePercentage <= 100;

  if (!coverageValid) {
    omissions.push({ factId: "coverage", reason: "invalid-coverage" });
  }

  const rarityValues = [
    data.loot.rarityTotals.unique,
    data.loot.rarityTotals.heroic,
    data.loot.rarityTotals.legendary,
  ];
  const rarityItemCount = rarityValues.every(isFiniteNonNegative)
    ? rarityValues.reduce((total, value) => total + value, 0)
    : 0;

  if (!rarityValues.every(isFiniteNonNegative)) {
    omissions.push({ factId: "rarity-items", reason: "invalid-value" });
  }

  const topHunter = validateLeader({
    factId: "top-hunter",
    result: data.leaders.topHunter as EventWrappedLeaderResult,
    sourceConsistent: killSourceConsistent,
    omissions,
  });
  const topScorer = validateLeader({
    factId: "top-scorer",
    result: data.leaders.topScorer as EventWrappedLeaderResult,
    omissions,
  });
  const longestDuty = assignmentWindowValid
    ? validateLeader({
        factId: "longest-duty",
        result: data.leaders.longestDuty as EventWrappedLeaderResult,
        omissions,
      })
    : null;

  const dominantHero = getDominantHero(data, killSourceConsistent);

  if (!dominantHero) {
    omissions.push({
      factId: "dominant-hero",
      reason: killSourceConsistent
        ? "insufficient-candidates"
        : "kill-source-mismatch",
    });
  }

  return {
    data,
    killSourceConsistent,
    assignmentWindowValid,
    coverageValid,
    rarityItemCount,
    leaders: {
      topHunter,
      topScorer,
      longestDuty,
    },
    dominantHero,
    omissions,
  };
};
