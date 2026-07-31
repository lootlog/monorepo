import type { WrappedQualityModel } from "./wrapped-data-quality";

export type WrappedFactId =
  | "kills"
  | "tracked-time"
  | "loot-records"
  | "rarity-items"
  | "coverage"
  | "busiest-hour"
  | "top-scorer"
  | "longest-duty"
  | "top-hunter"
  | "dominant-hero"
  | "participants"
  | "points";

export type WrappedFactSlide = {
  id: WrappedFactId;
  kind: "fact";
  value: number;
  secondaryValue?: number;
  subject?: string;
  avatar?: string | null;
};

export type WrappedSlide =
  | { id: "opening"; kind: "opening" }
  | WrappedFactSlide
  | {
      id: "finale";
      kind: "finale";
      highlights: WrappedFactSlide[];
    };

export type WrappedDeck =
  | { mode: "presentation"; slides: WrappedSlide[] }
  | { mode: "sparse"; facts: WrappedFactSlide[] };

const validPositive = (value: number): boolean =>
  Number.isFinite(value) && value > 0;

export const buildWrappedDeck = (quality: WrappedQualityModel): WrappedDeck => {
  const { data } = quality;
  const candidates: Array<WrappedFactSlide | null> = [
    validPositive(data.overview.totalKills)
      ? { id: "kills", kind: "fact", value: data.overview.totalKills }
      : null,
    validPositive(data.overview.totalTrackedSeconds)
      ? {
          id: "tracked-time",
          kind: "fact",
          value: data.overview.totalTrackedSeconds,
        }
      : null,
    validPositive(data.loot.totalLoots)
      ? {
          id: "loot-records",
          kind: "fact",
          value: data.loot.totalLoots,
        }
      : null,
    validPositive(quality.rarityItemCount)
      ? {
          id: "rarity-items",
          kind: "fact",
          value: quality.rarityItemCount,
        }
      : null,
    quality.coverageValid
      ? {
          id: "coverage",
          kind: "fact",
          value: data.coverage.coveragePercentage,
          secondaryValue: data.coverage.totalWindowCount,
        }
      : null,
    data.overview.busiestHour !== null &&
    Number.isInteger(data.overview.busiestHour) &&
    data.overview.busiestHour >= 0 &&
    data.overview.busiestHour <= 23 &&
    validPositive(data.overview.busiestHourKills)
      ? {
          id: "busiest-hour",
          kind: "fact",
          value: data.overview.busiestHour,
          secondaryValue: data.overview.busiestHourKills,
        }
      : null,
    quality.leaders.topScorer
      ? {
          id: "top-scorer",
          kind: "fact",
          value: quality.leaders.topScorer.leader.primaryValue,
          subject: quality.leaders.topScorer.leader.name,
          avatar: quality.leaders.topScorer.leader.avatar,
        }
      : null,
    quality.leaders.longestDuty
      ? {
          id: "longest-duty",
          kind: "fact",
          value: quality.leaders.longestDuty.leader.primaryValue,
          subject: quality.leaders.longestDuty.leader.name,
          avatar: quality.leaders.longestDuty.leader.avatar,
        }
      : null,
    quality.leaders.topHunter
      ? {
          id: "top-hunter",
          kind: "fact",
          value: quality.leaders.topHunter.leader.primaryValue,
          subject: quality.leaders.topHunter.leader.name,
          avatar: quality.leaders.topHunter.leader.avatar,
        }
      : null,
    quality.dominantHero
      ? {
          id: "dominant-hero",
          kind: "fact",
          value: quality.dominantHero.totalKills,
          subject: quality.dominantHero.npcName,
          avatar: quality.dominantHero.npcIcon,
        }
      : null,
    validPositive(data.overview.participantCount)
      ? {
          id: "participants",
          kind: "fact",
          value: data.overview.participantCount,
        }
      : null,
    validPositive(data.overview.totalPoints)
      ? { id: "points", kind: "fact", value: data.overview.totalPoints }
      : null,
  ];
  const facts = candidates
    .filter((candidate): candidate is WrappedFactSlide => candidate !== null)
    .slice(0, 8);

  if (facts.length < 3) {
    return { mode: "sparse", facts };
  }

  return {
    mode: "presentation",
    slides: [
      { id: "opening", kind: "opening" },
      ...facts,
      { id: "finale", kind: "finale", highlights: facts.slice(0, 3) },
    ],
  };
};
