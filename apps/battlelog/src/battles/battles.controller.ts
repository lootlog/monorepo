import type { BattlesService } from "#src/battles/battles.service";
import type { CreateBattleDto } from "#src/battles/dto/create-battle.dto";
import type { QueryBattleAnalyticsDto } from "#src/battles/dto/query-battle-analytics.dto";
import type {
  QueryAbyssSeasonsDto,
  QueryBattleStatisticsDto,
  QueryPlayerVsPlayerDto,
} from "#src/battles/dto/query-battle-statistics.dto";
import type { QueryBattlesDto } from "#src/battles/dto/query-battles.dto";
import type { UpdateBattleDto } from "#src/battles/dto/update-battle.dto";
import type {
  BattleResponseInput,
  BattlesListResponseInput,
} from "#src/battles/dto/battle-response.dto";
import type {
  BattleWithRelations,
  GetAllBattlesResult,
} from "#src/battles/interfaces/battle-service.interface";
import type { BattleAnalyticsService } from "#src/battles/services/battle-analytics.service";

const normalizeBattleResponse = (
  battle: BattleWithRelations,
): BattleResponseInput => ({
  ...battle,
  createdAt: battle.createdAt.toISOString(),
  updatedAt: battle.updatedAt.toISOString(),
  warriors: battle.warriors.map((warrior) => ({
    ...warrior,
    spellsUsedMap: warrior.spellsUsedMap as Record<string, number>,
  })),
  statistics: battle.statistics as BattleResponseInput["statistics"],
});

const normalizeBattlesListResponse = (
  response: GetAllBattlesResult,
): BattlesListResponseInput => ({
  ...response,
  battles: response.battles.map(normalizeBattleResponse),
});

export class BattlesController {
  constructor(
    private readonly battlesService: BattlesService,
    private readonly battleAnalyticsService: BattleAnalyticsService,
  ) {}

  createBattle(data: CreateBattleDto, userId: string) {
    return this.battlesService.createBattle({ data, userId });
  }

  async getDashboardBattles(query: QueryBattlesDto, userId: string) {
    return normalizeBattlesListResponse(
      await this.battlesService.getDashboardBattles(query, userId),
    );
  }

  getUserCharacters(userId: string) {
    return this.battlesService.getUserCharacters(userId);
  }

  getBattleAnalytics(query: QueryBattleAnalyticsDto, userId: string) {
    return this.battleAnalyticsService.getBattleAnalytics(query, userId);
  }

  getAbyssSeasons(query: QueryAbyssSeasonsDto, userId: string) {
    return this.battleAnalyticsService.getAbyssSeasons(query, userId);
  }

  getCombatProfile(query: QueryBattleStatisticsDto, userId: string) {
    return this.battleAnalyticsService.getCombatProfile(query, userId);
  }

  getProfessionWinRate(query: QueryBattleStatisticsDto, userId: string) {
    return this.battleAnalyticsService.calculateProfessionWinRate(
      query,
      userId,
    );
  }

  getHeadToHead(query: QueryBattleStatisticsDto, userId: string) {
    return this.battleAnalyticsService.getHeadToHead(query, userId);
  }

  getCurrentStreak(query: QueryBattleStatisticsDto, userId: string) {
    return this.battleAnalyticsService.getCurrentStreak(query, userId);
  }

  getBattleDuration(query: QueryBattleStatisticsDto, userId: string) {
    return this.battleAnalyticsService.getBattleDurationStats(query, userId);
  }

  getPhGrowth(query: QueryBattleStatisticsDto, userId: string) {
    return this.battleAnalyticsService.getPhGrowthTimeSeries(query, userId);
  }

  getRatingGrowth(query: QueryBattleStatisticsDto, userId: string) {
    return this.battleAnalyticsService.getRatingGrowthTimeSeries(query, userId);
  }

  getRatingDeltaByOpponent(query: QueryBattleStatisticsDto, userId: string) {
    return this.battleAnalyticsService.getRatingDeltaByOpponent(query, userId);
  }

  getPlayerVsPlayerBattles(query: QueryPlayerVsPlayerDto, userId: string) {
    return this.battleAnalyticsService.getPlayerVsPlayerBattles(query, userId);
  }

  searchWarriors(query: string, userId: string) {
    return this.battlesService.searchWarriors(query, userId);
  }

  getUserWorlds(userId: string) {
    return this.battlesService.getUserWorlds(userId);
  }

  getBattleTimeline(battleId: string, userId: string) {
    return this.battlesService.getBattleTimeline(battleId, userId);
  }

  async getBattle(battleId: string, userId: string) {
    return normalizeBattleResponse(
      await this.battlesService.getBattleFromDatabase(battleId, userId),
    );
  }

  getBattleRawData(battleId: string, userId: string) {
    return this.battlesService.getBattleRawData(battleId, userId);
  }

  async updateBattle(
    battleId: string,
    updateBattleDto: UpdateBattleDto,
    userId: string,
  ) {
    await this.battlesService.assertBattleOwner(battleId, userId);
    return normalizeBattleResponse(
      await this.battlesService.updateBattle(battleId, updateBattleDto),
    );
  }

  async deleteBattle(battleId: string, userId: string) {
    await this.battlesService.assertBattleOwner(battleId, userId);
    return this.battlesService.deleteBattle(battleId);
  }
}

export class PublicBattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  async getPublicBattle(battleId: string) {
    return normalizeBattleResponse(
      await this.battlesService.getPublicBattle(battleId),
    );
  }

  getPublicBattleRaw(battleId: string) {
    return this.battlesService.getPublicBattleRaw(battleId);
  }

  getPublicBattleTimeline(battleId: string) {
    return this.battlesService.getPublicBattleTimeline(battleId);
  }
}
