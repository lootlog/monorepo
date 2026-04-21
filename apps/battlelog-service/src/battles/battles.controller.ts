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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
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
import {
  type BattleResponseInput,
  type BattlesListResponseInput,
  BattleCharactersResponseDto,
  BattleCreatedResponseDto,
  BattleDeletedResponseDto,
  BattleRawResponseDto,
  BattleResponseDto,
  BattlesListResponseDto,
  BattleUserWorldsResponseDto,
  BattleWarriorsSearchResponseDto,
} from "src/battles/dto/battle-response.dto";
import {
  BattleAnalyticsResponseDto,
  BattleDurationStatsResponseDto,
  HeadToHeadPaginatedResponseDto,
  PhGrowthDataPointResponseDto,
  PlayerVsPlayerPaginatedResponseDto,
  ProfessionWinRateResponseDto,
  RatingDeltaByOpponentResponseDto,
  RatingGrowthDataPointResponseDto,
  StreakResponseDto,
} from "src/battles/dto/battle-statistics-response.dto";
import type {
  BattleWithRelations,
  GetAllBattlesResult,
} from "src/battles/interfaces/battle-service.interface";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { BattleAccessGuard } from "src/shared/guards/battle-access.guard";
import { BattleOwnerGuard } from "src/shared/guards/battle-owner.guard";

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

@ApiTags("battles")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("battles")
export class BattlesController {
  constructor(
    private readonly battlesService: BattlesService,
    private readonly battleAnalyticsService: BattleAnalyticsService,
  ) {}

  @Post("/")
  @ApiOperation({ summary: "Create a battle" })
  @ZodResponse({
    status: 201,
    type: BattleCreatedResponseDto,
  })
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
  @ApiOperation({ summary: "Get authenticated user battles" })
  @ZodResponse({
    status: 200,
    type: BattlesListResponseDto,
  })
  getDashboardBattles(
    @Query() query: QueryBattlesDto,
    @UserId() userId: string,
  ) {
    return this.battlesService
      .getDashboardBattles(query, userId)
      .then(normalizeBattlesListResponse);
  }

  @Get("/@me/characters")
  @ApiOperation({ summary: "Get authenticated user battle characters" })
  @ZodResponse({
    status: 200,
    type: BattleCharactersResponseDto,
  })
  getUserCharacters(@UserId() userId: string) {
    return this.battlesService.getUserCharacters(userId);
  }

  @Get("/@me/analytics")
  @ApiOperation({ summary: "Get authenticated user battle analytics" })
  @ZodResponse({
    status: 200,
    type: BattleAnalyticsResponseDto,
  })
  getBattleAnalytics(
    @Query() query: QueryBattleAnalyticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getBattleAnalytics(query, userId);
  }

  @Get("/@me/statistics/profession-win-rate")
  @ApiOperation({ summary: "Get profession win rate statistics" })
  @ZodResponse({
    status: 200,
    type: [ProfessionWinRateResponseDto],
  })
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
  @ApiOperation({ summary: "Get head-to-head statistics" })
  @ZodResponse({
    status: 200,
    type: HeadToHeadPaginatedResponseDto,
  })
  getHeadToHead(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getHeadToHead(query, userId);
  }

  @Get("/@me/statistics/streak")
  @ApiOperation({ summary: "Get current battle streak statistics" })
  @ZodResponse({
    status: 200,
    type: StreakResponseDto,
  })
  getCurrentStreak(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getCurrentStreak(query, userId);
  }

  @Get("/@me/statistics/duration")
  @ApiOperation({ summary: "Get battle duration statistics" })
  @ZodResponse({
    status: 200,
    type: BattleDurationStatsResponseDto,
  })
  getBattleDuration(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getBattleDurationStats(query, userId);
  }

  @Get("/@me/statistics/ph-growth")
  @ApiOperation({ summary: "Get PH growth statistics" })
  @ZodResponse({
    status: 200,
    type: [PhGrowthDataPointResponseDto],
  })
  getPhGrowth(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getPhGrowthTimeSeries(query, userId);
  }

  @Get("/@me/statistics/rating-growth")
  @ApiOperation({ summary: "Get rating growth statistics" })
  @ZodResponse({
    status: 200,
    type: [RatingGrowthDataPointResponseDto],
  })
  getRatingGrowth(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getRatingGrowthTimeSeries(query, userId);
  }

  @Get("/@me/statistics/rating-delta-by-opponent")
  @ApiOperation({ summary: "Get rating delta by opponent statistics" })
  @ZodResponse({
    status: 200,
    type: [RatingDeltaByOpponentResponseDto],
  })
  getRatingDeltaByOpponent(
    @Query() query: QueryBattleStatisticsDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getRatingDeltaByOpponent(query, userId);
  }

  @Get("/@me/statistics/player-vs-player")
  @ApiOperation({ summary: "Get player-vs-player battles" })
  @ZodResponse({
    status: 200,
    type: PlayerVsPlayerPaginatedResponseDto,
  })
  getPlayerVsPlayerBattles(
    @Query() query: QueryPlayerVsPlayerDto,
    @UserId() userId: string,
  ) {
    return this.battleAnalyticsService.getPlayerVsPlayerBattles(query, userId);
  }

  @Get("/@me/warriors/search")
  @ApiOperation({ summary: "Search warriors for authenticated user" })
  @ZodResponse({
    status: 200,
    type: BattleWarriorsSearchResponseDto,
  })
  searchWarriors(@Query("q") query: string, @UserId() userId: string) {
    return this.battlesService.searchWarriors(query, userId);
  }

  @Get("/@me/worlds")
  @ApiOperation({ summary: "Get worlds used by authenticated user battles" })
  @ZodResponse({
    status: 200,
    type: BattleUserWorldsResponseDto,
  })
  getUserWorlds(@UserId() userId: string) {
    return this.battlesService.getUserWorlds(userId);
  }

  @UseGuards(BattleAccessGuard)
  @Get("/:battleId")
  @ApiOperation({ summary: "Get a single battle" })
  @ZodResponse({
    status: 200,
    type: BattleResponseDto,
  })
  @ApiResponse({ status: 404, description: "Battle not found" })
  getBattle(@Param("battleId") battleId: string, @UserId() userId: string) {
    return this.battlesService
      .getBattleFromDatabase(battleId, userId)
      .then(normalizeBattleResponse);
  }

  @UseGuards(BattleAccessGuard)
  @Get("/:battleId/raw")
  @ApiOperation({ summary: "Get raw battle payload" })
  @ZodResponse({
    status: 200,
    type: BattleRawResponseDto,
  })
  @ApiResponse({ status: 404, description: "Battle not found" })
  getBattleRawData(
    @Param("battleId") battleId: string,
    @UserId() userId: string,
  ) {
    return this.battlesService.getBattleRawData(battleId, userId);
  }

  @UseGuards(BattleOwnerGuard)
  @Patch("/:battleId")
  @ApiOperation({ summary: "Update battle visibility" })
  @ZodResponse({
    status: 200,
    type: BattleResponseDto,
  })
  @ApiResponse({ status: 404, description: "Battle not found" })
  updateBattle(
    @Param("battleId") battleId: string,
    @Body() updateBattleDto: UpdateBattleDto,
  ) {
    return this.battlesService
      .updateBattle(battleId, updateBattleDto)
      .then(normalizeBattleResponse);
  }

  @UseGuards(BattleOwnerGuard)
  @Delete("/:battleId")
  @ApiOperation({ summary: "Delete a battle" })
  @ZodResponse({
    status: 200,
    type: BattleDeletedResponseDto,
  })
  @ApiResponse({ status: 404, description: "Battle not found" })
  deleteBattle(@Param("battleId") battleId: string) {
    return this.battlesService.deleteBattle(battleId);
  }
}

@ApiTags("public-battles")
@Controller("battles/public")
export class PublicBattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  @Get("/:battleId")
  @ApiOperation({ summary: "Get a public battle" })
  @ZodResponse({
    status: 200,
    type: BattleResponseDto,
  })
  @ApiResponse({ status: 404, description: "Public battle not found" })
  getPublicBattle(@Param("battleId") battleId: string) {
    return this.battlesService
      .getPublicBattle(battleId)
      .then(normalizeBattleResponse);
  }

  @Get("/:battleId/raw")
  @ApiOperation({ summary: "Get raw payload for a public battle" })
  @ZodResponse({
    status: 200,
    type: BattleRawResponseDto,
  })
  @ApiResponse({ status: 404, description: "Public battle not found" })
  getPublicBattleRaw(@Param("battleId") battleId: string) {
    return this.battlesService.getPublicBattleRaw(battleId);
  }
}
