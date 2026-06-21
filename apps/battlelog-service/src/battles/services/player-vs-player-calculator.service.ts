import { Injectable } from "@nestjs/common";
import type { PlayerVsPlayerBattleDto } from "src/battles/dto/battle-statistics-response.dto";
import type { QueryPlayerVsPlayerDto } from "src/battles/dto/query-battle-statistics.dto";
import { BattleAnalyticsDomainService } from "src/battles/services/battle-analytics-domain.service";
import type { InflatedBattleWithWarriors } from "src/battles/services/battle-analytics.types";

@Injectable()
export class PlayerVsPlayerCalculatorService {
  constructor(private readonly domainService: BattleAnalyticsDomainService) {}

  calculateBattles(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
    query: QueryPlayerVsPlayerDto,
  ): PlayerVsPlayerBattleDto[] {
    return battles
      .filter((battle) => this.shouldIncludeBattle(battle, query))
      .filter((battle) =>
        this.domainService.isOpponentLevelInRange(
          battle,
          characterIds,
          query.minLevel,
          query.maxLevel,
        ),
      )
      .map((battle) => {
        const userWarrior = this.domainService.findUserWarrior(
          battle,
          characterIds,
        );
        const opponentWarrior = this.domainService.findWarrior(
          battle,
          query.opponentId,
        );

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
          userWarrior: this.domainService.mapPlayerVsPlayerWarrior(userWarrior),
          opponentWarrior:
            this.domainService.mapPlayerVsPlayerWarrior(opponentWarrior),
        };
      });
  }

  private shouldIncludeBattle(
    battle: InflatedBattleWithWarriors,
    query: QueryPlayerVsPlayerDto,
  ): boolean {
    if (battle.type !== "1v1") {
      return false;
    }

    if (query.excludeBattleId && battle.id === query.excludeBattleId) {
      return false;
    }

    return battle.warriors.some(
      (warrior) => warrior.originalId === query.opponentId,
    );
  }
}
