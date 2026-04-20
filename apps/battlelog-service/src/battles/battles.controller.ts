import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserId } from "@lootlog/nest-shared/decorators";
import { BattlesService } from "src/battles/battles.service";
import { BattleAnalyticsService } from "src/battles/services/battle-analytics.service";
import { CreateBattleDto } from "src/battles/dto/create-battle.dto";
import { QueryBattlesDto } from "src/battles/dto/query-battles.dto";
import { QueryBattleAnalyticsDto } from "src/battles/dto/query-battle-analytics.dto";
import {
  QueryBattleStatisticsDto,
  QueryPlayerVsPlayerDto,
} from "src/battles/dto/query-battle-statistics.dto";
import { UpdateBattleDto } from "src/battles/dto/update-battle.dto";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { BattleAccessGuard } from "src/shared/guards/battle-access.guard";
import { BattleOwnerGuard } from "src/shared/guards/battle-owner.guard";

@UseGuards(AuthGuard)
@Controller("battles")
export class BattlesController {
  constructor(
    private readonly battlesService: BattlesService,
    private readonly battleAnalyticsService: BattleAnalyticsService,
  ) {}

  @Post("/")
  createBattle(
    @Body() createBattleDto: CreateBattleDto,
    @UserId() userId: string,
  ) {
    return this.battlesService.createBattle({
      data: createBattleDto,
      userId,
    });
  }

  @Get("/@me")
  getDashboardBattles(
    @Query() query: QueryBattlesDto,
    @UserId() userId: string,
  ) {
    return this.battlesService.getDashboardBattles(query, userId);
  }

  @Get("/@me/characters")
  getUserCharacters(@UserId() userId: string) {
    return this.battlesService.getUserCharacters(userId);
  }

  @Get("/@me/analytics")
  getBattleAnalytics(
    @Query() query: QueryBattleAnalyticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getBattleAnalytics(query, userId);
  }

  @Get("/@me/statistics/profession-win-rate")
  getProfessionWinRate(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.calculateProfessionWinRate(
      query,
      userId,
    );
  }

  @Get("/@me/statistics/head-to-head")
  getHeadToHead(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getHeadToHead(query, userId);
  }

  @Get("/@me/statistics/streak")
  getCurrentStreak(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getCurrentStreak(query, userId);
  }

  @Get("/@me/statistics/duration")
  getBattleDuration(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getBattleDurationStats(query, userId);
  }

  @Get("/@me/statistics/ph-growth")
  getPhGrowth(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getPhGrowthTimeSeries(query, userId);
  }

  @Get("/@me/statistics/rating-growth")
  getRatingGrowth(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getRatingGrowthTimeSeries(query, userId);
  }

  @Get("/@me/statistics/rating-delta-by-opponent")
  getRatingDeltaByOpponent(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getRatingDeltaByOpponent(query, userId);
  }

  @Get("/@me/statistics/player-vs-player")
  getPlayerVsPlayerBattles(
    @Query() query: QueryPlayerVsPlayerDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getPlayerVsPlayerBattles(query, userId);
  }

  @Get("/@me/warriors/search")
  searchWarriors(@Query("q") query: string, @UserId() userId: string) {
    return this.battlesService.searchWarriors(query, userId);
  }

  @Get("/@me/worlds")
  getUserWorlds(@UserId() userId: string) {
    return this.battlesService.getUserWorlds(userId);
  }

  @UseGuards(BattleAccessGuard)
  @Get("/:battleId")
  getBattle(@Param("battleId") battleId: string, @UserId() userId: string) {
    return this.battlesService.getBattleFromDatabase(battleId, userId);
  }

  @UseGuards(BattleAccessGuard)
  @Get("/:battleId/raw")
  getBattleRawData(
    @Param("battleId") battleId: string,
    @UserId() userId: string,
  ) {
    return this.battlesService.getBattleRawData(battleId, userId);
  }

  @UseGuards(BattleOwnerGuard)
  @Patch("/:battleId")
  updateBattle(
    @Param("battleId") battleId: string,
    @Body() updateBattleDto: UpdateBattleDto,
  ) {
    return this.battlesService.updateBattle(battleId, updateBattleDto);
  }

  @UseGuards(BattleOwnerGuard)
  @Delete("/:battleId")
  deleteBattle(@Param("battleId") battleId: string) {
    return this.battlesService.deleteBattle(battleId);
  }
}

@Controller("battles/public")
export class PublicBattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  @Get("/:battleId")
  getPublicBattle(@Param("battleId") battleId: string) {
    return this.battlesService.getPublicBattle(battleId);
  }

  @Get("/:battleId/raw")
  getPublicBattleRaw(@Param("battleId") battleId: string) {
    return this.battlesService.getPublicBattleRaw(battleId);
  }
}
