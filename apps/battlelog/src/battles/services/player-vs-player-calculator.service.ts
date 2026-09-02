import type { PlayerVsPlayerBattleDto } from "#src/battles/dto/battle-statistics-response.dto";
import type { QueryPlayerVsPlayerDto } from "#src/battles/dto/query-battle-statistics.dto";
import type { BattleAnalyticsDomain } from "#src/battles/services/battle-analytics-domain.service";
import type { InflatedBattleWithWarriors } from "#src/battles/services/battle-analytics.types";

export const makePlayerVsPlayerCalculator = (
  domain: BattleAnalyticsDomain,
) => ({
  calculateBattles(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
    query: QueryPlayerVsPlayerDto,
  ): PlayerVsPlayerBattleDto[] {
    return battles
      .filter((battle) => shouldIncludeBattle(battle, query))
      .filter((battle) =>
        domain.isOpponentLevelInRange(
          battle,
          characterIds,
          query.minLevel,
          query.maxLevel,
        ),
      )
      .map((battle) => {
        const userWarrior = domain.findUserWarrior(battle, characterIds);
        const opponentWarrior = domain.findWarrior(battle, query.opponentId);

        return {
          battleId: battle.id,
          createdAt: battle.createdAt.toISOString(),
          duration: battle.duration,
          winner: battle.winner,
          loser: battle.loser,
          hasFlee: battle.hasFlee,
          matchmaking: battle.matchmaking,
          ratingDelta: battle.ratingDelta,
          userRating: battle.rating,
          opponentRating: battle.opponentRating,
          userWarrior: domain.mapPlayerVsPlayerWarrior(userWarrior),
          opponentWarrior: domain.mapPlayerVsPlayerWarrior(opponentWarrior),
        };
      });
  },
});

const shouldIncludeBattle = (
  battle: InflatedBattleWithWarriors,
  query: QueryPlayerVsPlayerDto,
): boolean => {
  if (battle.type !== "1v1") return false;
  if (query.excludeBattleId && battle.id === query.excludeBattleId)
    return false;
  return battle.warriors.some(
    (warrior) => warrior.originalId === query.opponentId,
  );
};

export type PlayerVsPlayerCalculator = ReturnType<
  typeof makePlayerVsPlayerCalculator
>;
