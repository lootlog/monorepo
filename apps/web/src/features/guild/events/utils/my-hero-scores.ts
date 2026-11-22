import { orderBy } from "es-toolkit";
import type { EventHeroNpc, EventRanking } from "@/lib/api/event-types";

export type MyHeroScore = {
  hero: EventHeroNpc;
  place?: number;
  playerCount: number;
  points: number;
  kills: number;
};

export const getMyHeroScores = (
  heroes: EventHeroNpc[],
  rankings: EventRanking[],
  memberId: number | undefined,
): MyHeroScore[] =>
  heroes.map((hero) => {
    const heroRankings = orderBy(
      rankings.filter((ranking) => ranking.heroNpcName === hero.npcName),
      ["totalPoints"],
      ["desc"],
    );

    const index = heroRankings.findIndex(
      (ranking) => ranking.memberId === memberId,
    );

    const mine = heroRankings[index];

    return {
      hero,
      place: index < 0 ? undefined : index + 1,
      playerCount: heroRankings.length,
      points: mine?.totalPoints ?? 0,
      kills: mine?.totalKills ?? 0,
    };
  });
