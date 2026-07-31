import { describe, expect, it } from "vitest";
import type { EventWrapped } from "../../../types/api";
import { buildWrappedDeck } from "./build-wrapped-slides";
import { buildWrappedQualityModel } from "./wrapped-data-quality";

const leaderResult = (
  name: string,
  primaryValue: number,
  candidateCount = 2,
) => ({
  winner: {
    memberId: 1,
    name,
    avatar: null,
    primaryValue,
    secondaryValue: null,
  },
  candidateCount,
  tiedWinnerCount: 1,
});

const createWrapped = (): EventWrapped =>
  ({
    generatedAt: "2026-07-31T12:00:00.000Z",
    event: {
      id: "event-1",
      name: "Wakacje",
      world: "fobos",
      startsAt: "2026-07-31T08:00:00.000Z",
      endsAt: "2026-07-31T11:00:00.000Z",
      heroCount: 2,
      mapCount: 4,
      spawnCount: 4,
    },
    overview: {
      totalKills: 4,
      participantCount: 3,
      totalPoints: 18,
      totalTrackedSeconds: 7200,
      totalAfkSeconds: 0,
      coveragePercentage: 75,
      avgMapsPerSpawnWindow: 2,
      busiestHour: 9,
      busiestHourKills: 3,
      totalLoots: 2,
      rarityTotals: { unique: 1, heroic: 1, legendary: 1 },
    },
    leaders: {
      topHunter: leaderResult("Ada", 3),
      topScorer: leaderResult("Ada", 12),
      longestDuty: leaderResult("Bartek", 3600),
      topAfk: leaderResult("Celina", 30),
      mostFlexible: leaderResult("Bartek", 2),
      topEfficiency: leaderResult("Ada", 4),
    },
    coverage: {
      totalWindowCount: 2,
      totalWindowSeconds: 7200,
      totalCoverageSeconds: 5400,
      totalUncoveredSeconds: 1200,
      totalUnassignedSeconds: 600,
      coveragePercentage: 75,
      avgMapsPerSpawnWindow: 2,
      bestHeroCoverage: null,
      roughestHeroCoverage: null,
    },
    heroes: [
      {
        heroNpcId: "hero-1",
        npcId: 1,
        npcName: "Maddok",
        npcIcon: null,
        mapCount: 2,
        totalKills: 3,
        totalPoints: 12,
        coveragePercentage: 80,
        rarityTotals: { unique: 1, heroic: 1, legendary: 0 },
        topHunter: leaderResult("Ada", 2),
      },
      {
        heroNpcId: "hero-2",
        npcId: 2,
        npcName: "Zorin",
        npcIcon: null,
        mapCount: 2,
        totalKills: 1,
        totalPoints: 6,
        coveragePercentage: 70,
        rarityTotals: { unique: 0, heroic: 0, legendary: 1 },
        topHunter: leaderResult("Bartek", 1),
      },
    ],
    loot: {
      totalLoots: 2,
      rarityTotals: { unique: 1, heroic: 1, legendary: 1 },
      heroBreakdown: [],
    },
  }) as EventWrapped;

describe("event wrapped deck", () => {
  it("builds at most ten unique slides from verified facts", () => {
    const deck = buildWrappedDeck(buildWrappedQualityModel(createWrapped()));

    expect(deck.mode).toBe("presentation");
    if (deck.mode !== "presentation") {
      return;
    }

    expect(deck.slides).toHaveLength(10);
    expect(new Set(deck.slides.map((slide) => slide.id)).size).toBe(
      deck.slides.length,
    );
  });

  it("suppresses kill-derived superlatives when sources disagree", () => {
    const wrapped = createWrapped();
    wrapped.overview.totalKills = 25;
    const quality = buildWrappedQualityModel(wrapped);
    const deck = buildWrappedDeck(quality);

    expect(quality.killSourceConsistent).toBe(false);
    expect(quality.leaders.topHunter).toBeNull();
    expect(quality.dominantHero).toBeNull();
    if (deck.mode === "presentation") {
      expect(deck.slides.some((slide) => slide.id === "top-hunter")).toBe(
        false,
      );
      expect(deck.slides.some((slide) => slide.id === "dominant-hero")).toBe(
        false,
      );
    }
  });

  it("suppresses tied leaders", () => {
    const wrapped = createWrapped();
    wrapped.leaders.topScorer = {
      winner: null,
      candidateCount: 3,
      tiedWinnerCount: 2,
    };
    const quality = buildWrappedQualityModel(wrapped);

    expect(quality.leaders.topScorer).toBeNull();
    expect(quality.omissions).toContainEqual({
      factId: "top-scorer",
      reason: "tied-winner",
    });
  });

  it("uses a static sparse summary when fewer than three facts are verified", () => {
    const wrapped = createWrapped();
    wrapped.overview.totalKills = 0;
    wrapped.overview.totalTrackedSeconds = 0;
    wrapped.overview.totalPoints = 0;
    wrapped.overview.participantCount = 0;
    wrapped.overview.busiestHour = null;
    wrapped.overview.busiestHourKills = 0;
    wrapped.loot.totalLoots = 0;
    wrapped.loot.rarityTotals = { unique: 0, heroic: 0, legendary: 0 };
    wrapped.coverage.totalWindowCount = 0;
    wrapped.coverage.totalWindowSeconds = 0;
    wrapped.leaders.topScorer = {
      winner: null,
      candidateCount: 0,
      tiedWinnerCount: 0,
    };
    wrapped.leaders.longestDuty = {
      winner: null,
      candidateCount: 0,
      tiedWinnerCount: 0,
    };

    const deck = buildWrappedDeck(buildWrappedQualityModel(wrapped));

    expect(deck.mode).toBe("sparse");
  });
});
