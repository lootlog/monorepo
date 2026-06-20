import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import {
  and,
  desc,
  eq,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  not,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";
import type { CreateBattleDto } from "src/battles/dto/create-battle.dto";
import type { BattleTimelineResponseInput } from "src/battles/dto/battle-response.dto";
import type { QueryBattlesDto } from "src/battles/dto/query-battles.dto";
import type { UpdateBattleDto } from "src/battles/dto/update-battle.dto";
import type { PaginationOptions } from "src/battles/interfaces/pagination.interface";
import { BATTLE_WARRIOR_STATS_VERSION } from "src/battles/battle-warrior-stats.types";
import {
  buildBattleWarriorStats,
  inflateBattleWarriorsInBattle,
  inflateBattleWarriorsInBattles,
} from "src/battles/battle-warrior-stats";
import { BattleAnalyticsService } from "src/battles/services/battle-analytics.service";
import { PaginationService } from "src/battles/services/pagination.service";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import {
  battles,
  battleWarriors,
  userCharacters,
} from "src/shared/modules/drizzle/schema";
import { R2Service } from "src/shared/modules/r2/r2.service";
import {
  BattleProcessor,
  type Warrior,
  type BattleAnalysis,
  type ParsedMove,
  type BattleWarriorSnapshot,
} from "@lootlog/battle-processor";
import type {
  BattleWithRelations,
  CreateBattleParams,
  CreateBattleResult,
  DeleteBattleResult,
  GetAllBattlesResult,
  IBattlesService,
  RawBattleData,
} from "./interfaces/battle-service.interface";

@Injectable()
export class BattlesService implements IBattlesService {
  private readonly logger = new Logger(BattlesService.name);
  private readonly USER_METADATA_CACHE_TTL_SECONDS = 5 * 60;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly r2Service: R2Service,
    private readonly paginationService: PaginationService,
    private readonly battleAnalyticsService: BattleAnalyticsService,
    private readonly redisService: RedisService,
  ) {}

  private getUserCharactersCacheKey(userId: string) {
    return `battle-characters:list:${userId}`;
  }

  private getUserWorldsCacheKey(userId: string) {
    return `battle-worlds:${userId}:list`;
  }

  private warriorExists(
    battlesRef: typeof battles,
    ...conditions: (SQL | undefined)[]
  ) {
    return exists(
      this.drizzle.db
        .select({ one: eq(battleWarriors.id, battleWarriors.id) })
        .from(battleWarriors)
        .where(and(eq(battleWarriors.battleId, battlesRef.id), ...conditions)),
    );
  }

  async createBattle(params: CreateBattleParams): Promise<CreateBattleResult> {
    const { data, userId } = params;

    try {
      const analysis = this.analyzeBattle(data);
      const battle = await this.storeBattleInDatabase(data, userId, analysis);

      const rawBattleData = {
        events: analysis.parsedMoves,
        sourceEvents: data.events,
        accountId: data.accountId,
        characterId: data.characterId,
        world: data.world,
      };

      await this.storeRawBattleData(battle.id, rawBattleData);

      await this.battleAnalyticsService.invalidateAnalyticsCache(userId);

      return {
        battleId: battle.id,
      };
    } catch (error) {
      this.logger.error(`Failed to create battle for user ${userId}:`, error);
      throw new Error(
        `Battle creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async getExistingBattleBySubmissionId(
    submissionId: string | undefined,
  ): Promise<BattleWithRelations | null> {
    if (!submissionId) {
      return null;
    }

    const battle = await this.drizzle.db.query.battles.findFirst({
      where: { submissionId },
      with: { warriors: true },
    });

    return battle ? inflateBattleWarriorsInBattle(battle) : null;
  }

  async getPublicBattles(query: QueryBattlesDto): Promise<GetAllBattlesResult> {
    try {
      const filterBuilder = await this.buildFilterConditions(query);

      const paginationOptions = this.buildPaginationOptions(query);
      const result = await this.paginationService.paginateBattles(
        (table) => and(eq(table.public, true), filterBuilder(table)),
        paginationOptions,
      );

      return {
        battles: inflateBattleWarriorsInBattles(result.data),
        pagination: result.pagination,
        meta: {
          performance: result.performance,
        },
      };
    } catch (error) {
      this.logger.error("Failed to retrieve public battles:", error);
      throw new Error(
        `Failed to retrieve public battles: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getDashboardBattles(
    query: QueryBattlesDto,
    requestingUserId: string,
  ): Promise<GetAllBattlesResult> {
    try {
      const { userId: _userId, ...filteredQuery } = query;
      const filterBuilder = await this.buildFilterConditions(
        filteredQuery,
        requestingUserId,
      );

      const paginationOptions = this.buildPaginationOptions(query);
      const result = await this.paginationService.paginateBattles(
        (table) =>
          and(eq(table.userId, requestingUserId), filterBuilder(table)),
        paginationOptions,
      );

      return {
        battles: inflateBattleWarriorsInBattles(result.data),
        pagination: result.pagination,
        meta: {
          performance: result.performance,
        },
      };
    } catch (error) {
      this.logger.error("Failed to retrieve dashboard battles:", error);
      throw new Error(
        `Failed to retrieve dashboard battles: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getUserCharacters(userId: string): Promise<{
    characters: Array<{
      id: string;
      name: string;
      world: string;
      icon: string;
    }>;
  }> {
    return this.redisService.getOrSetJsonBestEffort({
      key: this.getUserCharactersCacheKey(userId),
      ttlSeconds: this.USER_METADATA_CACHE_TTL_SECONDS,
      onError: (error) =>
        this.logger.warn("User characters cache unavailable", error),
      factory: () => this.getUserCharactersUncached(userId),
    });
  }

  private async getUserCharactersUncached(userId: string): Promise<{
    characters: Array<{
      id: string;
      name: string;
      world: string;
      icon: string;
    }>;
  }> {
    try {
      const results = await this.drizzle.db.query.userCharacters.findMany({
        where: { userId },
        orderBy: { lastSeenAt: "desc" },
        columns: {
          characterId: true,
          name: true,
          world: true,
          icon: true,
        },
      });

      const characters = results.map((char) => ({
        id: char.characterId,
        name: char.name,
        world: char.world,
        icon: char.icon,
      }));

      return { characters };
    } catch (error) {
      this.logger.error("Failed to retrieve user characters:", error);
      throw new Error(
        `Failed to retrieve user characters: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getUserWorlds(userId: string): Promise<{ worlds: string[] }> {
    return this.redisService.getOrSetJsonBestEffort({
      key: this.getUserWorldsCacheKey(userId),
      ttlSeconds: this.USER_METADATA_CACHE_TTL_SECONDS,
      onError: (error) =>
        this.logger.warn("User worlds cache unavailable", error),
      factory: () => this.getUserWorldsUncached(userId),
    });
  }

  private async getUserWorldsUncached(
    userId: string,
  ): Promise<{ worlds: string[] }> {
    try {
      const results = await this.drizzle.db
        .selectDistinctOn([userCharacters.world], {
          world: userCharacters.world,
        })
        .from(userCharacters)
        .where(eq(userCharacters.userId, userId))
        .orderBy(userCharacters.world);

      const worlds = results.map((char) => char.world);

      return { worlds };
    } catch (error) {
      this.logger.error("Failed to retrieve user worlds:", error);
      throw new Error(
        `Failed to retrieve user worlds: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getBattleRawData(
    battleId: string,
    requestingUserId?: string,
  ): Promise<RawBattleData> {
    try {
      if (requestingUserId) {
        await this.checkBattleAccess(battleId, requestingUserId);
      }

      const rawData =
        await this.r2Service.getBattleData<RawBattleData>(battleId);
      return this.normalizeRawBattleData(rawData);
    } catch (error) {
      this.logger.error(
        `Failed to retrieve raw data for battle ${battleId}:`,
        error,
      );
      throw error;
    }
  }

  async getBattleTimeline(
    battleId: string,
    requestingUserId?: string,
  ): Promise<BattleTimelineResponseInput> {
    const battle = await this.getBattleFromDatabase(battleId, requestingUserId);
    return await this.buildTimelineResponse(battle);
  }

  async getPublicBattleTimeline(
    battleId: string,
  ): Promise<BattleTimelineResponseInput> {
    const battle = await this.getPublicBattle(battleId);
    return await this.buildTimelineResponse(battle);
  }

  async getBattleFromDatabase(
    battleId: string,
    requestingUserId?: string,
  ): Promise<BattleWithRelations> {
    if (requestingUserId) {
      await this.checkBattleAccess(battleId, requestingUserId);
    }

    const battle = await this.drizzle.db.query.battles.findFirst({
      where: { id: battleId },
      with: { warriors: true },
    });

    if (!battle) {
      throw new NotFoundException(`Battle with ID ${battleId} not found`);
    }

    await this.battleAnalyticsService.invalidateAnalyticsCache(battle.userId);

    return inflateBattleWarriorsInBattle(battle);
  }

  private async buildTimelineResponse(
    battle: BattleWithRelations,
  ): Promise<BattleTimelineResponseInput> {
    const rawBattleData = await this.r2Service.getBattleData<RawBattleData>(
      battle.id,
    );
    const processor = new BattleProcessor();

    let analysis: BattleAnalysis;
    if (rawBattleData.rawData.sourceEvents?.length) {
      analysis = processor.processBattle({
        accountId: rawBattleData.rawData.accountId,
        characterId: rawBattleData.rawData.characterId,
        world: rawBattleData.rawData.world,
        events: rawBattleData.rawData.sourceEvents,
      });
    } else {
      analysis = processor.processParsedBattle({
        accountId: rawBattleData.rawData.accountId,
        characterId: rawBattleData.rawData.characterId,
        world: rawBattleData.rawData.world,
        events: rawBattleData.rawData.events,
        warriors: this.createWarriorSnapshots(battle),
        duration: battle.duration,
        matchmaking: this.createTimelineMatchmakingSnapshot(battle),
      });
    }

    return {
      battleId: battle.id,
      generatedAt: new Date().toISOString(),
      timeline: analysis.battleTimeline,
      warriors: this.normalizeTimelineWarriors(battle),
    };
  }

  private createTimelineMatchmakingSnapshot(
    battle: BattleWithRelations,
  ): BattleAnalysis["matchmaking"] {
    if (!battle.matchmaking) {
      return undefined;
    }

    return {
      difficultyRank: battle.difficultyRank ?? 0,
      result: battle.result ?? 0,
      ratingDelta: battle.ratingDelta ?? 0,
      opponentLvl: battle.opponentLvl ?? 0,
      opponentOplvl: battle.opponentOplvl ?? 0,
      opponentRating: battle.opponentRating ?? 0,
      rating: battle.rating ?? 0,
      status: battle.status ?? 0,
      pointsGained: battle.pointsGained ?? undefined,
      placementCur: battle.placementCur ?? undefined,
      placementMax: battle.placementMax ?? undefined,
      dailyStageId: battle.dailyStageId ?? undefined,
      dailyPointsCur: battle.dailyPointsCur ?? undefined,
      dailyPointsMax: battle.dailyPointsMax ?? undefined,
      dailyPointsStep: battle.dailyPointsStep ?? undefined,
      dailyRewardsLast: battle.dailyRewardsLast ?? undefined,
      dailyRewardsCur: battle.dailyRewardsCur ?? undefined,
      dailyRewardsMax: battle.dailyRewardsMax ?? undefined,
    };
  }

  private createWarriorSnapshots(
    battle: BattleWithRelations,
  ): Record<string, BattleWarriorSnapshot> {
    return battle.warriors.reduce<Record<string, BattleWarriorSnapshot>>(
      (acc, warrior) => {
        const originalId = Number.parseInt(warrior.originalId, 10);
        acc[warrior.originalId] = {
          originalId: Number.isNaN(originalId) ? 0 : originalId,
          name: warrior.name,
          lvl: warrior.lvl,
          prof: warrior.prof,
          icon: warrior.icon,
          team: warrior.team,
        };

        return acc;
      },
      {},
    );
  }

  private normalizeTimelineWarriors(
    battle: BattleWithRelations,
  ): BattleTimelineResponseInput["warriors"] {
    return battle.warriors.map((warrior) => ({
      ...warrior,
      spellsUsedMap: warrior.spellsUsedMap as Record<string, number>,
    }));
  }

  async updateBattle(
    battleId: string,
    updateData: UpdateBattleDto,
  ): Promise<BattleWithRelations> {
    const updated = await this.drizzle.db
      .update(battles)
      .set({
        public: updateData.public,
        updatedAt: new Date(),
      })
      .where(eq(battles.id, battleId))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException(`Battle with ID ${battleId} not found`);
    }

    const battle = await this.drizzle.db.query.battles.findFirst({
      where: { id: battleId },
      with: { warriors: true },
    });

    if (!battle) {
      throw new NotFoundException(`Battle with ID ${battleId} not found`);
    }

    return inflateBattleWarriorsInBattle(battle);
  }

  async deleteUserBattles(userId: string): Promise<{ deletedCount: number }> {
    const userBattles = await this.drizzle.db
      .select({ id: battles.id })
      .from(battles)
      .where(eq(battles.userId, userId));

    const battleIds = userBattles.map((b) => b.id);

    if (battleIds.length === 0) {
      await this.drizzle.db
        .delete(userCharacters)
        .where(eq(userCharacters.userId, userId));

      return { deletedCount: 0 };
    }

    await this.drizzle.db.delete(battles).where(eq(battles.userId, userId));

    await this.drizzle.db
      .delete(userCharacters)
      .where(eq(userCharacters.userId, userId));

    try {
      await this.r2Service.deleteBattleDataBatch(battleIds);
    } catch (error) {
      this.logger.warn(
        `Failed to delete R2 data for user ${userId}: ${battleIds.length} battles`,
        error,
      );
    }

    this.logger.log(`Deleted ${battleIds.length} battles for user ${userId}`);
    await this.battleAnalyticsService.invalidateAnalyticsCache(userId);

    return { deletedCount: battleIds.length };
  }

  async deleteBattle(battleId: string): Promise<DeleteBattleResult> {
    const battle = await this.drizzle.db.query.battles.findFirst({
      where: { id: battleId },
      columns: { userId: true },
    });

    const deleted = await this.drizzle.db
      .delete(battles)
      .where(eq(battles.id, battleId))
      .returning({ id: battles.id });

    if (deleted.length === 0) {
      throw new NotFoundException(`Battle with ID ${battleId} not found`);
    }

    if (battle) {
      await this.battleAnalyticsService.invalidateAnalyticsCache(battle.userId);
    }

    try {
      await this.r2Service.deleteBattleData(battleId);
    } catch (error) {
      this.logger.warn(
        `Failed to delete R2 data for battle ${battleId}`,
        error,
      );
    }

    return { message: "Battle deleted successfully" };
  }

  async getPublicBattle(battleId: string): Promise<BattleWithRelations> {
    const battle = await this.drizzle.db.query.battles.findFirst({
      where: { id: battleId, public: true },
      with: { warriors: true },
    });

    if (!battle) {
      throw new NotFoundException(
        `Public battle with ID ${battleId} not found`,
      );
    }

    return inflateBattleWarriorsInBattle(battle);
  }

  async getPublicBattleRaw(battleId: string): Promise<RawBattleData> {
    const battle = await this.drizzle.db.query.battles.findFirst({
      where: { id: battleId, public: true },
      columns: { id: true },
    });

    if (!battle) {
      throw new NotFoundException(
        `Public battle with ID ${battleId} not found`,
      );
    }

    const rawData = await this.r2Service.getBattleData<RawBattleData>(
      battle.id,
    );

    return this.normalizeRawBattleData(rawData);
  }

  private normalizeRawBattleData(rawBattleData: RawBattleData): RawBattleData {
    if (!rawBattleData.rawData.sourceEvents?.length) {
      return rawBattleData;
    }

    const processor = new BattleProcessor();

    return {
      ...rawBattleData,
      rawData: {
        ...rawBattleData.rawData,
        events: processor.extractAndParseMoves(
          rawBattleData.rawData.sourceEvents,
        ),
      },
    };
  }

  analyzeBattle(dto: CreateBattleDto): BattleAnalysis {
    try {
      const processor = new BattleProcessor();
      const analysis = processor.processBattle(dto);

      return analysis;
    } catch (error) {
      this.logger.error("Failed to analyze battle data:", error);
      throw new Error(
        `Battle analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async buildFilterConditions(
    query: QueryBattlesDto,
    userId?: string,
  ): Promise<(battlesRef: typeof battles) => SQL | undefined> {
    let characterIds = query.characterId || [];
    if (query.result?.length && !characterIds.length && userId) {
      const userChars = await this.drizzle.db.query.userCharacters.findMany({
        where: { userId },
        columns: { characterId: true },
      });
      characterIds = userChars.map((c) => c.characterId);
    }

    return (battlesRef: typeof battles) => {
      const conditions: (SQL | undefined)[] = [];

      if (query.world) conditions.push(eq(battlesRef.world, query.world));
      if (query.userId) conditions.push(eq(battlesRef.userId, query.userId));
      if (typeof query.public === "boolean")
        conditions.push(eq(battlesRef.public, query.public));

      if (characterIds.length) {
        conditions.push(
          characterIds.length === 1
            ? eq(battlesRef.characterId, characterIds[0])
            : inArray(battlesRef.characterId, characterIds),
        );
      }

      if (query.type?.length) {
        const hasSolo = query.type.includes("solo");
        const hasGroup = query.type.includes("group");
        if (hasSolo && !hasGroup) {
          conditions.push(eq(battlesRef.type, "1v1"));
        } else if (hasGroup && !hasSolo) {
          conditions.push(not(eq(battlesRef.type, "1v1")));
        }
      }

      if (query.result?.length && characterIds.length) {
        const resultConditions: (SQL | undefined)[] = [];

        if (query.result.includes("won")) {
          for (const charId of characterIds) {
            for (const team of [1, 2]) {
              resultConditions.push(
                and(
                  this.warriorExists(
                    battlesRef,
                    eq(battleWarriors.originalId, charId),
                    eq(battleWarriors.team, team),
                  ),
                  eq(battlesRef.winningTeam, team),
                  eq(battlesRef.hasFlee, false),
                ),
              );
            }
          }
        }

        if (query.result.includes("lost")) {
          for (const charId of characterIds) {
            for (const team of [1, 2]) {
              resultConditions.push(
                and(
                  this.warriorExists(
                    battlesRef,
                    eq(battleWarriors.originalId, charId),
                    eq(battleWarriors.team, team),
                  ),
                  eq(battlesRef.losingTeam, team),
                  eq(battlesRef.hasFlee, false),
                ),
              );
            }
          }
        }

        if (query.result.includes("flee")) {
          resultConditions.push(eq(battlesRef.hasFlee, true));
        }

        if (resultConditions.length) {
          conditions.push(or(...resultConditions));
        }
      }

      if (query.ph === true) {
        const phConditions: (SQL | undefined)[] = [gt(battleWarriors.ph, 0)];
        if (characterIds.length) {
          phConditions.push(inArray(battleWarriors.originalId, characterIds));
        }
        conditions.push(this.warriorExists(battlesRef, ...phConditions));
      }

      if (query.matchmaking !== undefined) {
        conditions.push(eq(battlesRef.matchmaking, query.matchmaking));
      }

      if (query.startDate) {
        conditions.push(gte(battlesRef.createdAt, new Date(query.startDate)));
      }

      if (query.endDate) {
        conditions.push(lte(battlesRef.createdAt, new Date(query.endDate)));
      }

      if (query.search) {
        conditions.push(
          this.warriorExists(
            battlesRef,
            ilike(battleWarriors.name, `%${query.search}%`),
          ),
        );
      }

      if (query.minLevel !== undefined || query.maxLevel !== undefined) {
        const levelConditions: (SQL | undefined)[] = [];

        if (query.minLevel !== undefined && query.maxLevel !== undefined) {
          levelConditions.push(gte(battleWarriors.lvl, query.minLevel));
          levelConditions.push(lte(battleWarriors.lvl, query.maxLevel));
        } else if (query.minLevel !== undefined) {
          levelConditions.push(gte(battleWarriors.lvl, query.minLevel));
        } else if (query.maxLevel !== undefined) {
          levelConditions.push(lte(battleWarriors.lvl, query.maxLevel));
        }

        if (characterIds.length) {
          levelConditions.push(
            notInArray(battleWarriors.originalId, characterIds),
          );
        }

        conditions.push(this.warriorExists(battlesRef, ...levelConditions));
      }

      return conditions.length ? and(...conditions) : undefined;
    };
  }

  private buildPaginationOptions(query: QueryBattlesDto): PaginationOptions {
    return {
      sortOrder: query.sortOrder ?? "desc",
      includeTotal: query.includeTotal ?? false,
      cursor: query.cursor,
      size: query.size,
    };
  }

  private async checkBattleAccess(
    battleId: string,
    requestingUserId: string,
  ): Promise<void> {
    const battle = await this.drizzle.db.query.battles.findFirst({
      where: { id: battleId },
      columns: { userId: true, public: true },
    });

    if (!battle) {
      throw new NotFoundException(`Battle with ID ${battleId} not found`);
    }

    if (!battle.public && battle.userId !== requestingUserId) {
      throw new ForbiddenException("Access denied: Battle is private");
    }
  }

  private async upsertUserCharacter(
    userId: string,
    characterId: string,
    name: string,
    world: string,
    icon: string,
  ): Promise<void> {
    try {
      await this.drizzle.db
        .insert(userCharacters)
        .values({
          userId,
          characterId,
          name,
          world,
          icon,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            userCharacters.userId,
            userCharacters.characterId,
            userCharacters.world,
          ],
          set: { name, icon, lastSeenAt: new Date(), updatedAt: new Date() },
        });
    } catch (error) {
      this.logger.warn(
        `Failed to upsert character ${characterId} for user ${userId}`,
        error,
      );
    }
  }

  private async storeBattleInDatabase(
    data: CreateBattleDto,
    userId: string,
    analysis: BattleAnalysis,
  ): Promise<BattleWithRelations> {
    try {
      const userWarrior = analysis.warriors.find(
        (w) => w.originalId === data.characterId,
      );
      if (userWarrior) {
        await this.upsertUserCharacter(
          userId,
          data.characterId,
          userWarrior.name,
          data.world,
          userWarrior.icon,
        );
      }

      const battle = await this.drizzle.db.transaction(async (tx) => {
        const [insertedBattle] = await tx
          .insert(battles)
          .values({
            userId,
            updatedAt: new Date(),
            accountId: data.accountId,
            characterId: data.characterId,
            ...(data.submissionId && {
              submissionId: data.submissionId,
            }),
            world: data.world,
            duration: analysis.duration,
            type: analysis.type,
            winner: analysis.outcome.winner,
            loser: analysis.outcome.loser,
            winningTeam: analysis.outcome.winningTeam!,
            losingTeam: analysis.outcome.losingTeam!,
            hasFlee: analysis.outcome.hasFlee,
            matchmaking: !!analysis.matchmaking,
            statistics: analysis.statistics,
            ...(analysis.matchmaking && {
              difficultyRank: analysis.matchmaking.difficultyRank,
              result: analysis.matchmaking.result,
              ratingDelta: analysis.matchmaking.ratingDelta,
              opponentLvl: analysis.matchmaking.opponentLvl,
              opponentOplvl: analysis.matchmaking.opponentOplvl,
              opponentRating: analysis.matchmaking.opponentRating,
              rating: analysis.matchmaking.rating,
              status: analysis.matchmaking.status,
              pointsGained: analysis.matchmaking.pointsGained,
              placementCur: analysis.matchmaking.placementCur,
              placementMax: analysis.matchmaking.placementMax,
              dailyStageId: analysis.matchmaking.dailyStageId,
              dailyPointsCur: analysis.matchmaking.dailyPointsCur,
              dailyPointsMax: analysis.matchmaking.dailyPointsMax,
              dailyPointsStep: analysis.matchmaking.dailyPointsStep,
              dailyRewardsLast: analysis.matchmaking.dailyRewardsLast,
              dailyRewardsCur: analysis.matchmaking.dailyRewardsCur,
              dailyRewardsMax: analysis.matchmaking.dailyRewardsMax,
            }),
          })
          .returning();

        const warriorValues = analysis.warriors.map((warrior: Warrior) => ({
          battleId: insertedBattle.id,
          originalId: warrior.originalId,
          name: warrior.name,
          lvl: warrior.lvl,
          prof: warrior.prof,
          icon: warrior.icon,
          team: warrior.team,
          isDead: warrior.isDead,
          surrendered: warrior.surrendered,
          fled: warrior.fled,
          maxHp: warrior.maxHp,
          turns: warrior.turns,
          turnsLost: warrior.turnsLost,
          steps: warrior.steps,
          normalAttacks: warrior.normalAttacks,
          spellsUsed: warrior.spellsUsed,
          spellsUsedMap: warrior.spellsUsedMap,
          stats: buildBattleWarriorStats(warrior),
          statsVersion: BATTLE_WARRIOR_STATS_VERSION,
          damageDealt: warrior.damageDealt,
          distanceDamage: warrior.distanceDamage,
          meleeDamage: warrior.meleeDamage,
          auxiliaryDamage: warrior.auxiliaryDamage,
          fireDamage: warrior.fireDamage,
          frostDamage: warrior.frostDamage,
          lightningDamage: warrior.lightningDamage,
          thirdAttDamage: warrior.thirdAttDamage,
          damageDealtAfterDefensive: warrior.damageDealtAfterDefensive,
          damageDealtAfterDefensivePercentage:
            warrior.damageDealtAfterDefensivePercentage,
          damageTaken: warrior.damageTaken,
          distanceDamageTaken: warrior.distanceDamageTaken,
          meleeDamageTaken: warrior.meleeDamageTaken,
          auxiliaryDamageTaken: warrior.auxiliaryDamageTaken,
          fireDamageTaken: warrior.fireDamageTaken,
          frostDamageTaken: warrior.frostDamageTaken,
          lightningDamageTaken: warrior.lightningDamageTaken,
          thirdAttDamageTaken: warrior.thirdAttDamageTaken,
          flatDamageTaken: warrior.flatDamageTaken,
          rageDamageDealt: warrior.rageDamageDealt,
          trueDamageDealt: warrior.trueDamageDealt,
          trueDamageTaken: warrior.trueDamageTaken,
          stigmaDamageDealt: warrior.stigmaDamageDealt,
          stigmaDamageTaken: warrior.stigmaDamageTaken,
          passiveHealing: warrior.passiveHealing,
          activeHealing: warrior.activeHealing,
          armorPierces: warrior.armorPierces,
          criticalHits: warrior.criticalHits,
          reducedArmor: warrior.reducedArmor,
          reducedPoisonResistance: warrior.reducedPoisonResistance,
          magicResistanceDestroyed: warrior.magicResistanceDestroyed,
          evasions: warrior.evasions,
          attacksEvaded: warrior.attacksEvaded,
          counters: warrior.counters,
          fastArrows: warrior.fastArrows,
          blocks: warrior.blocks,
          attacksBlocked: warrior.attacksBlocked,
          blockedDamage: warrior.blockedDamage,
          woundDamageTaken: warrior.woundDamageTaken,
          poisonDamageTaken: warrior.poisonDamageTaken,
          injureDamageTaken: warrior.injureDamageTaken,
          injures: warrior.injures,
          critWoundDamageTaken: warrior.critWoundDamageTaken,
          firePassiveDamageTaken: warrior.firePassiveDamageTaken,
          lightningPassiveDamageTaken: warrior.lightningPassiveDamageTaken,
          destroyedEnergy: warrior.destroyedEnergy,
          destroyedMana: warrior.destroyedMana,
          regeneratedEnergy: warrior.regeneratedEnergy,
          regeneratedMana: warrior.regeneratedMana,
          reflectedDamage: warrior.reflectedDamage,
          reflectedDamageTaken: warrior.reflectedDamageTaken,
          legbonCurse: warrior.legbonCurse,
          legbonCleanse: warrior.legbonCleanse,
          legbonLastheal: warrior.legbonLastheal,
          legbonLasthealValue: warrior.legbonLasthealValue,
          legbonGlare: warrior.legbonGlare,
          legbonHolytouch: warrior.legbonHolytouch,
          legbonHolytouchValue: warrior.legbonHolytouchValue,
          legbonCritredValue: warrior.legbonCritredValue,
          legbonVerycrit: warrior.legbonVerycrit,
          legbonAnguish: warrior.legbonAnguish,
          legbonFacadeValue: warrior.legbonFacadeValue,
          legbonPunctureValue: warrior.legbonPunctureValue,
          legbons: warrior.legbons,
          legbonAnguishDamageTaken: warrior.legbonAnguishDamageTaken,
          ph: warrior.ph,
        }));

        const insertedWarriors = await tx
          .insert(battleWarriors)
          .values(warriorValues)
          .returning();

        return { ...insertedBattle, warriors: insertedWarriors };
      });

      return inflateBattleWarriorsInBattle(battle);
    } catch (error) {
      const existingBattle = await this.getExistingBattleBySubmissionId(
        data.submissionId,
      );

      if (existingBattle) {
        return existingBattle;
      }

      this.logger.error("Failed to store battle in database:", error);
      throw new Error(
        `Database storage failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async storeRawBattleData(
    battleId: string,
    data: Omit<CreateBattleDto, "events"> & {
      events: ParsedMove[];
      sourceEvents?: CreateBattleDto["events"];
    },
  ): Promise<void> {
    try {
      const rawBattleData: RawBattleData = {
        battleId,
        timestamp: new Date().toISOString(),
        rawData: data,
      };

      await this.r2Service.uploadBattleData(battleId, rawBattleData);
    } catch (error) {
      this.logger.error(
        `Failed to store raw battle data for ${battleId}:`,
        error,
      );
      throw new Error(
        `R2 storage failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async searchWarriors(
    query: string,
    userId: string,
  ): Promise<{
    warriors: Array<{ name: string; icon: string; prof: string; lvl: number }>;
  }> {
    try {
      if (!query || query.trim().length < 2) {
        return { warriors: [] };
      }

      const results = await this.drizzle.db
        .selectDistinctOn([battleWarriors.name], {
          name: battleWarriors.name,
          icon: battleWarriors.icon,
          prof: battleWarriors.prof,
          lvl: battleWarriors.lvl,
        })
        .from(battleWarriors)
        .innerJoin(battles, eq(battleWarriors.battleId, battles.id))
        .where(
          and(
            eq(battles.userId, userId),
            ilike(battleWarriors.name, `%${query.trim()}%`),
          ),
        )
        .orderBy(battleWarriors.name, desc(battleWarriors.id))
        .limit(10);

      return { warriors: results };
    } catch (error) {
      this.logger.error("Failed to search warriors:", error);
      throw error;
    }
  }
}
