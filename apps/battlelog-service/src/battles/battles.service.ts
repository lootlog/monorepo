import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import { and, eq } from "drizzle-orm";
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
import { BattleListFilterService } from "src/battles/services/battle-list-filter.service";
import { BattleMetadataService } from "src/battles/services/battle-metadata.service";
import { PaginationService } from "src/battles/services/pagination.service";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import {
  battles,
  battleWarriors,
  userCharacters,
} from "src/shared/modules/drizzle/schema";
import { R2Service } from "src/shared/modules/r2/r2.service";
import {
  createBattleSemanticFingerprint,
  normalizeBattleSubmission,
} from "src/battles/battle-submission";
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

const BATTLE_DEDUPLICATION_TTL_SECONDS = 10;
const BATTLE_DEDUPLICATION_LOCK_TTL_SECONDS = 30;
const BATTLE_DEDUPLICATION_WAIT_TIMEOUT_MS = 30_000;
const BATTLE_DEDUPLICATION_WAIT_INTERVAL_MS = 50;
const RELEASE_BATTLE_DEDUPLICATION_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

@Injectable()
export class BattlesService implements IBattlesService {
  private readonly logger = new Logger(BattlesService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly r2Service: R2Service,
    private readonly redisService: RedisService,
    private readonly paginationService: PaginationService,
    private readonly battleAnalyticsService: BattleAnalyticsService,
    private readonly battleListFilterService: BattleListFilterService,
    private readonly battleMetadataService: BattleMetadataService,
  ) {}

  async createBattle(params: CreateBattleParams): Promise<CreateBattleResult> {
    const { data, userId } = params;

    try {
      const normalizedData = normalizeBattleSubmission(data);
      const semanticFingerprint = createBattleSemanticFingerprint({
        data: normalizedData,
        userId,
      });

      return await this.runBattleCreationSingleFlight(semanticFingerprint, () =>
        this.createCanonicalBattle({
          data: normalizedData,
          semanticFingerprint,
          userId,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to create battle for user ${userId}:`, error);
      if (error instanceof HttpException) throw error;
      throw new Error(
        `Battle creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async createCanonicalBattle({
    data,
    semanticFingerprint,
    userId,
  }: {
    data: CreateBattleDto;
    semanticFingerprint: string;
    userId: string;
  }): Promise<CreateBattleResult> {
    const analysis = this.analyzeBattle(data);
    const existingBattleId = await this.getRecentBattleIdBySemanticFingerprint(
      semanticFingerprint,
      userId,
    );
    const battleId =
      existingBattleId ??
      (
        await this.storeBattleInDatabase(
          data,
          userId,
          analysis,
          semanticFingerprint,
        )
      ).id;

    await this.storeRawBattleData(battleId, {
      events: analysis.parsedMoves,
      sourceEvents: data.events,
      accountId: data.accountId,
      characterId: data.characterId,
      world: data.world,
    });
    await this.battleAnalyticsService.invalidateAnalyticsCache(userId);

    return { battleId };
  }

  private async runBattleCreationSingleFlight(
    semanticFingerprint: string,
    createBattle: () => Promise<CreateBattleResult>,
  ): Promise<CreateBattleResult> {
    const cacheKey = `battle-submission:${semanticFingerprint}`;
    const lockKey = `${cacheKey}:lock`;
    const deadline = Date.now() + BATTLE_DEDUPLICATION_WAIT_TIMEOUT_MS;

    while (true) {
      const cachedResult = await this.requireBattleDeduplicationRedis(() =>
        this.redisService.getJson<CreateBattleResult>(cacheKey),
      );
      if (cachedResult) return cachedResult;
      this.throwIfBattleDeduplicationTimedOut(deadline);

      const lockToken = randomUUID();
      const lockAcquired = await this.requireBattleDeduplicationRedis(() =>
        this.redisService.setNX(
          lockKey,
          lockToken,
          BATTLE_DEDUPLICATION_LOCK_TTL_SECONDS,
        ),
      );

      if (lockAcquired) {
        try {
          const cachedAfterLock = await this.requireBattleDeduplicationRedis(
            () => this.redisService.getJson<CreateBattleResult>(cacheKey),
          );
          if (cachedAfterLock) return cachedAfterLock;

          const result = await createBattle();
          await this.requireBattleDeduplicationRedis(() =>
            this.redisService.setJson(
              cacheKey,
              result,
              BATTLE_DEDUPLICATION_TTL_SECONDS,
            ),
          );
          return result;
        } finally {
          await this.releaseBattleDeduplicationLock(lockKey, lockToken);
        }
      }

      await sleep(BATTLE_DEDUPLICATION_WAIT_INTERVAL_MS);
    }
  }

  private throwIfBattleDeduplicationTimedOut(deadline: number): void {
    if (Date.now() >= deadline) {
      throw new ServiceUnavailableException(
        "Battle deduplication timed out; retry the request",
      );
    }
  }

  private async requireBattleDeduplicationRedis<Result>(
    operation: () => Promise<Result>,
  ): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      throw new ServiceUnavailableException(
        "Battle deduplication is temporarily unavailable",
        { cause: error },
      );
    }
  }

  private async releaseBattleDeduplicationLock(
    lockKey: string,
    lockToken: string,
  ): Promise<void> {
    try {
      await this.redisService.eval<number>(
        RELEASE_BATTLE_DEDUPLICATION_LOCK_SCRIPT,
        [lockKey],
        [lockToken],
      );
    } catch {
      // The lock expires automatically after its short TTL.
    }
  }

  private async getRecentBattleIdBySemanticFingerprint(
    semanticFingerprint: string,
    userId: string,
  ): Promise<string | null> {
    const createdAfter = new Date(
      Date.now() - BATTLE_DEDUPLICATION_TTL_SECONDS * 1_000,
    );
    const battle = await this.drizzle.db.query.battles.findFirst({
      where: {
        createdAt: { gte: createdAfter },
        semanticFingerprint,
        userId,
      },
      columns: { id: true },
      orderBy: { createdAt: "desc" },
    });
    return battle?.id ?? null;
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
      const filterBuilder =
        await this.battleListFilterService.buildFilterConditions(query);

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
      const filterBuilder =
        await this.battleListFilterService.buildFilterConditions(
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
    return this.battleMetadataService.getUserCharacters(userId);
  }

  async getUserWorlds(userId: string): Promise<{ worlds: string[] }> {
    return this.battleMetadataService.getUserWorlds(userId);
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
    return this.buildTimelineResponse(battle);
  }

  async getPublicBattleTimeline(
    battleId: string,
  ): Promise<BattleTimelineResponseInput> {
    const battle = await this.getPublicBattle(battleId);
    return this.buildTimelineResponse(battle);
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

  private async storeBattleInDatabase(
    data: CreateBattleDto,
    userId: string,
    analysis: BattleAnalysis,
    semanticFingerprint: string,
  ): Promise<BattleWithRelations> {
    try {
      const userWarrior = analysis.warriors.find(
        (w) => w.originalId === data.characterId,
      );
      if (userWarrior) {
        await this.battleMetadataService.upsertUserCharacter({
          userId,
          characterId: data.characterId,
          name: userWarrior.name,
          world: data.world,
          icon: userWarrior.icon,
        });
      }

      const battle = await this.drizzle.db.transaction(async (tx) => {
        const [insertedBattle] = await tx
          .insert(battles)
          .values({
            userId,
            updatedAt: new Date(),
            accountId: data.accountId,
            characterId: data.characterId,
            semanticFingerprint,
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
    return this.battleMetadataService.searchWarriors(query, userId);
  }
}
