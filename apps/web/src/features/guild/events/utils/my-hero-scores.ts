import { orderBy } from "es-toolkit";
import type { EventHeroNpc, EventRanking } from "../types/api";

export type MyHeroScore = {
  hero: EventHeroNpc;
  /** The member's place in the hero's ranking, by points; absent before a kill. */
  place?: number;
  playerCount: number;
  points: number;
  kills: number;
};

/**
 * The member's standing in each hero's ranking. Rankings are per hero, so a
 * place only exists within one hero.
 */
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
