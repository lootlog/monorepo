import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '../../generated/client';
import type { CreateBattleDto } from 'src/battles/dto/create-battle.dto';
import {
  SortOrder,
  type QueryBattlesDto,
} from 'src/battles/dto/query-battles.dto';
import type { QueryBattleAnalyticsDto } from 'src/battles/dto/query-battle-analytics.dto';
import type { QueryBattleStatisticsDto } from 'src/battles/dto/query-battle-statistics.dto';
import type {
  BattleStatisticsResponseDto,
  ProfessionWinRateDto,
  HeadToHeadRecordDto,
  StreakDto,
  BattleDurationStatsDto,
  PhGrowthDataPointDto,
} from 'src/battles/dto/battle-statistics-response.dto';
import type { UpdateBattleDto } from 'src/battles/dto/update-battle.dto';
import type { PaginationOptions } from 'src/battles/interfaces/pagination.interface';
import { PaginationService } from 'src/battles/services/pagination.service';
import { PrismaService } from 'src/shared/modules/prisma/prisma.service';
import { R2Service } from 'src/shared/modules/r2/r2.service';
import { RedisService } from 'src/shared/modules/redis/redis.service';
import {
  BattleProcessor,
  type Warrior,
  type BattleAnalysis,
  type ParsedMove,
} from './battle-processor';
import type {
  BattleWithRelations,
  CreateBattleParams,
  CreateBattleResult,
  DeleteBattleResult,
  GetAllBattlesResult,
  IBattlesService,
  RawBattleData,
} from './interfaces/battle-service.interface';

@Injectable()
export class BattlesService implements IBattlesService {
  private readonly logger = new Logger(BattlesService.name);
  private readonly ANALYTICS_CACHE_PREFIX = 'analytics';
  private readonly ANALYTICS_CACHE_TTL = 5 * 60; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
    private readonly paginationService: PaginationService,
    private readonly redisService: RedisService,
  ) {}

  async createBattle(params: CreateBattleParams): Promise<CreateBattleResult> {
    const { data, userId } = params;

    try {
      const analysis = this.analyzeBattle(data);
      const battle = await this.storeBattleInDatabase(data, userId, analysis);

      const rawBattleData = {
        events: analysis.parsedMoves,
        accountId: data.accountId,
        characterId: data.characterId,
        world: data.world,
      };

      await this.storeRawBattleData(battle.id, rawBattleData);

      await this.invalidateAnalyticsCache(userId);

      this.logger.log(
        `Battle ${battle.id} created successfully for user ${userId}`,
      );

      return {
        battleId: battle.id,
      };
    } catch (error) {
      this.logger.error(`Failed to create battle for user ${userId}:`, error);
      throw new Error(
        `Battle creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getPublicBattles(query: QueryBattlesDto): Promise<GetAllBattlesResult> {
    try {
      const where = await this.buildFilterConditions(query);
      where.public = true;

      const paginationOptions = this.buildPaginationOptions(query);
      const result = await this.paginationService.paginateBattles(
        where,
        paginationOptions,
      );

      this.logger.log(
        `Paginated public battles in ${result.performance.queryTime}ms`,
      );

      return {
        battles: result.data,
        pagination: result.pagination,
        meta: {
          performance: result.performance,
        },
      };
    } catch (error) {
      this.logger.error('Failed to retrieve public battles:', error);
      throw new Error(
        `Failed to retrieve public battles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getDashboardBattles(
    query: QueryBattlesDto,
    requestingUserId: string,
  ): Promise<GetAllBattlesResult> {
    try {
      const where = await this.buildFilterConditions(query, requestingUserId);
      where.userId = requestingUserId;

      const paginationOptions = this.buildPaginationOptions(query);
      const result = await this.paginationService.paginateBattles(
        where,
        paginationOptions,
      );

      this.logger.log(
        `Paginated dashboard battles for user ${requestingUserId} in ${result.performance.queryTime}ms`,
      );

      return {
        battles: result.data,
        pagination: result.pagination,
        meta: {
          performance: result.performance,
        },
      };
    } catch (error) {
      this.logger.error('Failed to retrieve dashboard battles:', error);
      throw new Error(
        `Failed to retrieve dashboard battles: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    try {
      const userCharacters = await this.prisma.userCharacter.findMany({
        where: { userId },
        orderBy: { lastSeenAt: 'desc' },
        select: {
          characterId: true,
          name: true,
          world: true,
          icon: true,
        },
      });

      const characters = userCharacters.map((char) => ({
        id: char.characterId,
        name: char.name,
        world: char.world,
        icon: char.icon,
      }));

      this.logger.log(
        `Retrieved ${characters.length} characters for user ${userId}`,
      );

      return { characters };
    } catch (error) {
      this.logger.error('Failed to retrieve user characters:', error);
      throw new Error(
        `Failed to retrieve user characters: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getUserWorlds(userId: string): Promise<{ worlds: string[] }> {
    try {
      const userCharacters = await this.prisma.userCharacter.findMany({
        where: { userId },
        select: { world: true },
        distinct: ['world'],
        orderBy: { world: 'asc' },
      });

      const worlds = userCharacters.map((char) => char.world);

      this.logger.log(`Retrieved ${worlds.length} worlds for user ${userId}`);

      return { worlds };
    } catch (error) {
      this.logger.error('Failed to retrieve user worlds:', error);
      throw new Error(
        `Failed to retrieve user worlds: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

      const rawData = await this.r2Service.getBattleData(battleId);
      this.logger.debug(`Retrieved raw data for battle ${battleId}`);
      return rawData;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve raw data for battle ${battleId}:`,
        error,
      );
      throw error;
    }
  }

  async getBattleFromDatabase(
    battleId: string,
    requestingUserId?: string,
  ): Promise<BattleWithRelations> {
    try {
      if (requestingUserId) {
        await this.checkBattleAccess(battleId, requestingUserId);
      }

      return await this.prisma.battle.findUniqueOrThrow({
        where: { id: battleId },
        include: { warriors: true },
      });
    } catch (error) {
      this.handlePrismaError(error, `Battle with ID ${battleId} not found`);
      throw error;
    }
  }

  async updateBattle(
    battleId: string,
    updateData: UpdateBattleDto,
  ): Promise<BattleWithRelations> {
    try {
      const battle = await this.prisma.battle.update({
        where: { id: battleId },
        data: {
          public: updateData.public,
          updatedAt: new Date(),
        },
        include: { warriors: true },
      });

      this.logger.log(
        `Battle ${battleId} updated (public: ${updateData.public})`,
      );
      return battle;
    } catch (error) {
      this.handlePrismaError(error, `Battle with ID ${battleId} not found`);
      throw error;
    }
  }

  async deleteBattle(battleId: string): Promise<DeleteBattleResult> {
    try {
      await this.prisma.battle.delete({ where: { id: battleId } });

      try {
        await this.r2Service.deleteBattleData(battleId);
      } catch (error) {
        this.logger.warn(
          `Failed to delete R2 data for battle ${battleId}`,
          error,
        );
      }

      this.logger.log(`Battle ${battleId} deleted`);
      return { message: 'Battle deleted successfully' };
    } catch (error) {
      this.handlePrismaError(error, `Battle with ID ${battleId} not found`);
      throw error;
    }
  }

  async getPublicBattle(battleId: string): Promise<BattleWithRelations> {
    try {
      return await this.prisma.battle.findUniqueOrThrow({
        where: { id: battleId, public: true },
        include: { warriors: true },
      });
    } catch (error) {
      this.handlePrismaError(
        error,
        `Public battle with ID ${battleId} not found`,
      );
      throw error;
    }
  }

  async getPublicBattleRaw(battleId: string): Promise<RawBattleData> {
    try {
      const battle = await this.prisma.battle.findUniqueOrThrow({
        where: { id: battleId, public: true },
        select: { id: true },
      });
      return await this.r2Service.getBattleData(battle.id);
    } catch (error) {
      this.handlePrismaError(
        error,
        `Public battle with ID ${battleId} not found`,
      );
      throw error;
    }
  }

  analyzeBattle(dto: CreateBattleDto): BattleAnalysis {
    try {
      const processor = new BattleProcessor();
      const analysis = processor.processBattle(dto);

      this.logger.debug(
        `Analyzed battle: ${analysis.type}, duration: ${analysis.duration}ms`,
      );
      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze battle data:', error);
      throw new Error(
        `Battle analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async buildFilterConditions(
    query: QueryBattlesDto,
    userId?: string,
  ): Promise<Prisma.BattleWhereInput> {
    const where: Prisma.BattleWhereInput = {};
    const andConditions: Prisma.BattleWhereInput[] = [];

    if (query.world) where.world = query.world;
    if (query.userId) where.userId = query.userId;
    if (typeof query.public === 'boolean') where.public = query.public;

    let characterIds = query.characterId || [];
    if (query.result?.length && !characterIds.length && userId) {
      const userCharacters = await this.prisma.userCharacter.findMany({
        where: { userId },
        select: { characterId: true },
      });
      characterIds = userCharacters.map((c) => c.characterId);
    }

    if (characterIds.length) {
      where.characterId =
        characterIds.length === 1 ? characterIds[0] : { in: characterIds };
    }

    if (query.type?.length) {
      const hasSolo = query.type.includes('solo');
      const hasGroup = query.type.includes('group');
      if (hasSolo && !hasGroup) {
        where.type = '1v1';
      } else if (hasGroup && !hasSolo) {
        where.type = { not: '1v1' };
      }
    }

    if (query.result?.length && characterIds.length) {
      const resultConditions: Prisma.BattleWhereInput[] = [];

      if (query.result.includes('won')) {
        characterIds.forEach((charId) => {
          [1, 2].forEach((team) => {
            resultConditions.push({
              AND: [
                { warriors: { some: { originalId: charId, team } } },
                { winningTeam: team },
                { hasFlee: false },
              ],
            });
          });
        });
      }

      if (query.result.includes('lost')) {
        characterIds.forEach((charId) => {
          [1, 2].forEach((team) => {
            resultConditions.push({
              AND: [
                { warriors: { some: { originalId: charId, team } } },
                { losingTeam: team },
                { hasFlee: false },
              ],
            });
          });
        });
      }

      if (query.result.includes('flee')) {
        resultConditions.push({ hasFlee: true });
      }

      if (resultConditions.length) {
        andConditions.push({ OR: resultConditions });
      }
    }

    if (query.ph === true) {
      const phFilter: any = { ph: { gt: 0 } };
      if (characterIds.length) {
        phFilter.originalId = { in: characterIds };
      }
      andConditions.push({ warriors: { some: phFilter } });
    }

    if (query.search) {
      andConditions.push({
        warriors: {
          some: {
            name: { contains: query.search, mode: 'insensitive' },
          },
        },
      });
    }

    if (andConditions.length) {
      where.AND = andConditions;
    }

    return where;
  }

  private buildPaginationOptions(query: QueryBattlesDto): PaginationOptions {
    return {
      sortOrder: query.sortOrder ?? SortOrder.DESC,
      includeTotal: query.includeTotal ?? false,
      cursor: query.cursor,
      size: query.size,
    };
  }

  private async checkBattleAccess(
    battleId: string,
    requestingUserId: string,
  ): Promise<void> {
    try {
      const battle = await this.prisma.battle.findUniqueOrThrow({
        where: { id: battleId },
        select: { userId: true, public: true },
      });

      if (!battle.public && battle.userId !== requestingUserId) {
        throw new ForbiddenException('Access denied: Battle is private');
      }
    } catch (error) {
      this.handlePrismaError(error, `Battle with ID ${battleId} not found`);
      throw error;
    }
  }

  private handlePrismaError(error: unknown, message: string): void {
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025') ||
      (error instanceof Error && error.name === 'NotFoundError')
    ) {
      throw new NotFoundException(message);
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
      await this.prisma.userCharacter.upsert({
        where: { userId_characterId_world: { userId, characterId, world } },
        update: { name, icon, lastSeenAt: new Date() },
        create: { userId, characterId, name, world, icon },
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

      const battleData = {
        userId,
        accountId: data.accountId,
        characterId: data.characterId,
        world: data.world,
        duration: analysis.duration,
        type: analysis.type,
        winner: analysis.outcome.winner,
        loser: analysis.outcome.loser,
        winningTeam: analysis.outcome.winningTeam!,
        losingTeam: analysis.outcome.losingTeam!,
        hasFlee: analysis.outcome.hasFlee,
        matchmaking: data.matchmaking ?? false,
        statistics: analysis.statistics as unknown as Prisma.InputJsonValue,
        warriors: {
          create: analysis.warriors.map(
            (
              warrior: Warrior,
            ): Prisma.BattleWarriorCreateWithoutBattleInput => ({
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
            }),
          ),
        },
      };

      const battle = await this.prisma.battle.create({
        data: battleData,
        include: {
          warriors: true,
        },
      });

      this.logger.debug(`Battle stored in database with ID: ${battle.id}`);
      return battle;
    } catch (error) {
      this.logger.error('Failed to store battle in database:', error);
      throw new Error(
        `Database storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async storeRawBattleData(
    battleId: string,
    data: Omit<CreateBattleDto, 'events'> & {
      events: ParsedMove[];
    },
  ): Promise<void> {
    try {
      const rawBattleData: RawBattleData = {
        battleId,
        timestamp: new Date().toISOString(),
        rawData: data,
      };

      await this.r2Service.uploadBattleData(battleId, rawBattleData);
      this.logger.debug(
        `Raw battle data stored successfully for battle ${battleId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store raw battle data for ${battleId}:`,
        error,
      );
      throw new Error(
        `R2 storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

      const warriors = await this.prisma.battleWarrior.findMany({
        where: {
          battle: {
            userId,
          },
          name: {
            contains: query.trim(),
            mode: 'insensitive',
          },
        },
        select: {
          name: true,
          icon: true,
          prof: true,
          lvl: true,
        },
        distinct: ['name'],
        take: 10,
        orderBy: {
          name: 'asc',
        },
      });

      this.logger.log(
        `Found ${warriors.length} warriors matching "${query}" for user ${userId}`,
      );

      return { warriors };
    } catch (error) {
      this.logger.error('Failed to search warriors:', error);
      throw error;
    }
  }

  async getBattleAnalytics(
    query: QueryBattleAnalyticsDto,
    userId: string,
  ): Promise<{
    totalBattles: number;
    wins: number;
    losses: number;
    winRatio: number;
    totalPH: number;
  }> {
    try {
      const cacheKey = `${this.ANALYTICS_CACHE_PREFIX}:${userId}:${query.characterId || 'all'}:${query.world || 'all'}:${query.period || 'all'}`;

      const cachedResult = await this.redisService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`Analytics cache hit for user ${userId}`);
        return JSON.parse(cachedResult);
      }

      // Get character IDs to filter by
      let characterIds: string[] = [];

      if (query.characterId) {
        // Verify the character belongs to the user
        const userCharacter = await this.prisma.userCharacter.findFirst({
          where: {
            userId,
            characterId: query.characterId,
            ...(query.world && { world: query.world }),
          },
        });

        if (!userCharacter) {
          throw new NotFoundException(
            `Character ${query.characterId} not found for user`,
          );
        }

        characterIds = [query.characterId];
      } else {
        // Get all user's characters
        const userCharacters = await this.prisma.userCharacter.findMany({
          where: {
            userId,
            ...(query.world && { world: query.world }),
          },
          select: { characterId: true },
        });

        characterIds = userCharacters.map((c) => c.characterId);
      }

      if (characterIds.length === 0) {
        return {
          totalBattles: 0,
          wins: 0,
          losses: 0,
          winRatio: 0,
          totalPH: 0,
        };
      }

      // Calculate date filter based on period
      let startDate: Date | undefined;
      if (query.period) {
        const now = new Date();
        const periodMap: Record<string, number> = {
          '24h': 1,
          '3d': 3,
          '7d': 7,
          '14d': 14,
          '30d': 30,
          '90d': 90,
          '180d': 180,
        };

        const days = periodMap[query.period];
        startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      }

      // Build filter for battles
      const where: Prisma.BattleWhereInput = {
        userId,
        ...(query.world && { world: query.world }),
        ...(startDate && { createdAt: { gte: startDate } }),
        warriors: {
          some: {
            originalId: { in: characterIds },
          },
        },
      };

      // Get all battles with warriors data
      const battles = await this.prisma.battle.findMany({
        where,
        include: {
          warriors: {
            where: {
              originalId: { in: characterIds },
            },
          },
        },
      });

      // Calculate analytics
      let wins = 0;
      let losses = 0;
      let totalPH = 0;

      for (const battle of battles) {
        const userWarrior = battle.warriors[0]; // We filtered for user's characters only

        if (userWarrior) {
          // Calculate PH
          totalPH += userWarrior.ph;

          // Determine if won or lost (exclude flee battles)
          if (!battle.hasFlee) {
            if (userWarrior.team === battle.winningTeam) {
              wins++;
            } else if (userWarrior.team === battle.losingTeam) {
              losses++;
            }
          }
        }
      }

      const totalBattles = wins + losses;
      const winRatio = totalBattles > 0 ? wins / totalBattles : 0;

      const result = {
        totalBattles,
        wins,
        losses,
        winRatio: Math.round(winRatio * 10000) / 100, // Round to 2 decimal places, as percentage
        totalPH,
      };

      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.ANALYTICS_CACHE_TTL,
      );

      this.logger.log(
        `Analytics for user ${userId}: ${totalBattles} battles, ${wins} wins, ${losses} losses, ${totalPH} PH (cached)`,
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to retrieve battle analytics:', error);
      throw error;
    }
  }

  private async invalidateAnalyticsCache(userId: string): Promise<void> {
    try {
      const pattern = `${this.ANALYTICS_CACHE_PREFIX}:${userId}:*`;
      const redis = await this.redisService.getClient();
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
        this.logger.debug(
          `Invalidated ${keys.length} analytics cache entries for user ${userId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate analytics cache for user ${userId}:`,
        error,
      );
    }
  }

  private async getCharacterIds(
    userId: string,
    query: QueryBattleStatisticsDto,
  ): Promise<string[]> {
    if (query.characterId) {
      const userCharacter = await this.prisma.userCharacter.findFirst({
        where: {
          userId,
          characterId: query.characterId,
          ...(query.world && { world: query.world }),
        },
      });

      if (!userCharacter) {
        throw new NotFoundException(
          `Character ${query.characterId} not found for user`,
        );
      }

      return [query.characterId];
    }

    const userCharacters = await this.prisma.userCharacter.findMany({
      where: {
        userId,
        ...(query.world && { world: query.world }),
      },
      select: { characterId: true },
    });

    return userCharacters.map((c) => c.characterId);
  }

  private getDateFilter(period?: string): Date | undefined {
    if (!period || period === 'all') return undefined;

    const now = new Date();
    const periodMap: Record<string, number> = {
      '24h': 1,
      '3d': 3,
      '7d': 7,
      '14d': 14,
      '30d': 30,
      '90d': 90,
      '180d': 180,
    };

    const days = periodMap[period];
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  async calculateProfessionWinRate(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<ProfessionWinRateDto[]> {
    try {
      const cacheKey = `statistics:profession-win-rate:${userId}:${query.characterId || 'all'}:${query.world || 'all'}:${query.period || 'all'}`;

      const cachedResult = await this.redisService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`Profession win rate cache hit for user ${userId}`);
        return JSON.parse(cachedResult);
      }

      const characterIds = await this.getCharacterIds(userId, query);

      if (characterIds.length === 0) {
        return [];
      }

      const startDate = this.getDateFilter(query.period);

      const where: Prisma.BattleWhereInput = {
        userId,
        type: '1v1',
        hasFlee: false,
        ...(query.world && { world: query.world }),
        ...(startDate && { createdAt: { gte: startDate } }),
        warriors: {
          some: {
            originalId: { in: characterIds },
          },
        },
      };

    const battles = await this.prisma.battle.findMany({
      where,
      include: {
        warriors: true,
      },
    });

    const professionStats = new Map<string, { wins: number; losses: number }>();

    for (const battle of battles) {
      const userWarrior = battle.warriors.find((w) =>
        characterIds.includes(w.originalId),
      );
      const opponentWarrior = battle.warriors.find(
        (w) => !characterIds.includes(w.originalId),
      );

      if (userWarrior && opponentWarrior) {
        const prof = opponentWarrior.prof;
        const stats = professionStats.get(prof) || { wins: 0, losses: 0 };

        if (userWarrior.team === battle.winningTeam) {
          stats.wins++;
        } else if (userWarrior.team === battle.losingTeam) {
          stats.losses++;
        }

        professionStats.set(prof, stats);
      }
    }

      const result = Array.from(professionStats.entries())
        .map(([prof, stats]) => {
          const totalBattles = stats.wins + stats.losses;
          return {
            prof,
            wins: stats.wins,
            losses: stats.losses,
            totalBattles,
            winRate: totalBattles > 0 ? Math.round((stats.wins / totalBattles) * 10000) / 100 : 0,
          };
        })
        .sort((a, b) => b.totalBattles - a.totalBattles);

      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.ANALYTICS_CACHE_TTL,
      );

      this.logger.log(`Profession win rate calculated for user ${userId} (cached)`);

      return result;
    } catch (error) {
      this.logger.error('Failed to calculate profession win rate:', error);
      throw error;
    }
  }

  async getHeadToHeadRecords(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<HeadToHeadRecordDto[]> {
    try {
      const cacheKey = `statistics:head-to-head:${userId}:${query.characterId || 'all'}:${query.world || 'all'}:${query.period || 'all'}`;

      const cachedResult = await this.redisService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`Head-to-head cache hit for user ${userId}`);
        return JSON.parse(cachedResult);
      }

      const characterIds = await this.getCharacterIds(userId, query);

      if (characterIds.length === 0) {
        return [];
      }

      const startDate = this.getDateFilter(query.period);

      const where: Prisma.BattleWhereInput = {
        userId,
        type: '1v1',
        hasFlee: false,
        ...(query.world && { world: query.world }),
        ...(startDate && { createdAt: { gte: startDate } }),
        warriors: {
          some: {
            originalId: { in: characterIds },
          },
        },
      };

    const battles = await this.prisma.battle.findMany({
      where,
      include: {
        warriors: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const opponentStats = new Map<
      string,
      {
        name: string;
        icon: string;
        prof: string;
        lvl: number;
        wins: number;
        losses: number;
        lastBattleDate: Date;
      }
    >();

    for (const battle of battles) {
      const userWarrior = battle.warriors.find((w) =>
        characterIds.includes(w.originalId),
      );
      const opponentWarrior = battle.warriors.find(
        (w) => !characterIds.includes(w.originalId),
      );

      if (userWarrior && opponentWarrior) {
        const opponentId = opponentWarrior.originalId;
        const stats = opponentStats.get(opponentId) || {
          name: opponentWarrior.name,
          icon: opponentWarrior.icon,
          prof: opponentWarrior.prof,
          lvl: opponentWarrior.lvl,
          wins: 0,
          losses: 0,
          lastBattleDate: battle.createdAt,
        };

        if (userWarrior.team === battle.winningTeam) {
          stats.wins++;
        } else if (userWarrior.team === battle.losingTeam) {
          stats.losses++;
        }

        if (battle.createdAt > stats.lastBattleDate) {
          stats.lastBattleDate = battle.createdAt;
        }

        opponentStats.set(opponentId, stats);
      }
    }

      const result = Array.from(opponentStats.entries())
        .map(([opponentId, stats]) => {
          const totalBattles = stats.wins + stats.losses;
          return {
            opponentId,
            opponentName: stats.name,
            opponentIcon: stats.icon,
            opponentProf: stats.prof,
            opponentLvl: stats.lvl,
            wins: stats.wins,
            losses: stats.losses,
            totalBattles,
            winRate: totalBattles > 0 ? Math.round((stats.wins / totalBattles) * 10000) / 100 : 0,
            lastBattleDate: stats.lastBattleDate.toISOString(),
          };
        })
        .sort((a, b) => b.totalBattles - a.totalBattles)
        .slice(0, 10);

      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.ANALYTICS_CACHE_TTL,
      );

      this.logger.log(`Head-to-head records calculated for user ${userId} (cached)`);

      return result;
    } catch (error) {
      this.logger.error('Failed to get head-to-head records:', error);
      throw error;
    }
  }

  async getCurrentStreak(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<StreakDto> {
    try {
      const cacheKey = `statistics:streak:${userId}:${query.characterId || 'all'}:${query.world || 'all'}:${query.period || 'all'}`;

      const cachedResult = await this.redisService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`Streak cache hit for user ${userId}`);
        return JSON.parse(cachedResult);
      }

      const characterIds = await this.getCharacterIds(userId, query);

      if (characterIds.length === 0) {
        return {
          current: { type: 'none', count: 0 },
          longest: { wins: 0, losses: 0 },
        };
      }

      const startDate = this.getDateFilter(query.period);

      const where: Prisma.BattleWhereInput = {
        userId,
        hasFlee: false,
        ...(query.world && { world: query.world }),
        ...(startDate && { createdAt: { gte: startDate } }),
        warriors: {
          some: {
            originalId: { in: characterIds },
          },
        },
      };

    const battles = await this.prisma.battle.findMany({
      where,
      include: {
        warriors: {
          where: {
            originalId: { in: characterIds },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (battles.length === 0) {
      return {
        current: { type: 'none', count: 0 },
        longest: { wins: 0, losses: 0 },
      };
    }

    let currentStreak = 0;
    let currentType: 'wins' | 'losses' | 'none' = 'none';
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    for (const battle of battles) {
      const userWarrior = battle.warriors[0];
      if (!userWarrior) continue;

      const isWin = userWarrior.team === battle.winningTeam;

      if (currentType === 'none') {
        currentType = isWin ? 'wins' : 'losses';
        currentStreak = 1;
      } else if ((currentType === 'wins' && isWin) || (currentType === 'losses' && !isWin)) {
        currentStreak++;
      } else {
        break;
      }

      if (isWin) {
        tempWinStreak++;
        if (tempWinStreak > longestWinStreak) {
          longestWinStreak = tempWinStreak;
        }
        tempLossStreak = 0;
      } else {
        tempLossStreak++;
        if (tempLossStreak > longestLossStreak) {
          longestLossStreak = tempLossStreak;
        }
        tempWinStreak = 0;
      }
    }

      const result = {
        current: { type: currentType, count: currentStreak },
        longest: { wins: longestWinStreak, losses: longestLossStreak },
      };

      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.ANALYTICS_CACHE_TTL,
      );

      this.logger.log(`Streak calculated for user ${userId} (cached)`);

      return result;
    } catch (error) {
      this.logger.error('Failed to get current streak:', error);
      throw error;
    }
  }

  async getBattleDurationStats(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<BattleDurationStatsDto> {
    try {
      const cacheKey = `statistics:duration:${userId}:${query.characterId || 'all'}:${query.world || 'all'}:${query.period || 'all'}`;

      const cachedResult = await this.redisService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`Duration stats cache hit for user ${userId}`);
        return JSON.parse(cachedResult);
      }

      const characterIds = await this.getCharacterIds(userId, query);

      if (characterIds.length === 0) {
        return {
          avgWinDuration: 0,
          avgLossDuration: 0,
          fastest: null,
          longest: null,
        };
      }

      const startDate = this.getDateFilter(query.period);

      const where: Prisma.BattleWhereInput = {
        userId,
        hasFlee: false,
        ...(query.world && { world: query.world }),
        ...(startDate && { createdAt: { gte: startDate } }),
        warriors: {
          some: {
            originalId: { in: characterIds },
          },
        },
      };

    const battles = await this.prisma.battle.findMany({
      where,
      include: {
        warriors: {
          where: {
            originalId: { in: characterIds },
          },
        },
      },
      orderBy: {
        duration: 'asc',
      },
    });

    if (battles.length === 0) {
      return {
        avgWinDuration: 0,
        avgLossDuration: 0,
        fastest: null,
        longest: null,
      };
    }

    let totalWinDuration = 0;
    let totalLossDuration = 0;
    let winCount = 0;
    let lossCount = 0;

    for (const battle of battles) {
      const userWarrior = battle.warriors[0];
      if (!userWarrior) continue;

      const isWin = userWarrior.team === battle.winningTeam;

      if (isWin) {
        totalWinDuration += battle.duration;
        winCount++;
      } else {
        totalLossDuration += battle.duration;
        lossCount++;
      }
    }

      const avgWinDuration = winCount > 0 ? Math.round(totalWinDuration / winCount) : 0;
      const avgLossDuration = lossCount > 0 ? Math.round(totalLossDuration / lossCount) : 0;

      const fastest = battles[0]
        ? { duration: battles[0].duration, battleId: battles[0].id }
        : null;
      const longest = battles[battles.length - 1]
        ? { duration: battles[battles.length - 1].duration, battleId: battles[battles.length - 1].id }
        : null;

      const result = {
        avgWinDuration,
        avgLossDuration,
        fastest,
        longest,
      };

      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.ANALYTICS_CACHE_TTL,
      );

      this.logger.log(`Duration stats calculated for user ${userId} (cached)`);

      return result;
    } catch (error) {
      this.logger.error('Failed to get battle duration stats:', error);
      throw error;
    }
  }

  async getPhGrowthTimeSeries(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<PhGrowthDataPointDto[]> {
    try {
      const cacheKey = `statistics:ph-growth:${userId}:${query.characterId || 'all'}:${query.world || 'all'}:${query.period || 'all'}`;

      const cachedResult = await this.redisService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`PH growth cache hit for user ${userId}`);
        return JSON.parse(cachedResult);
      }

      const characterIds = await this.getCharacterIds(userId, query);

      if (characterIds.length === 0) {
        return [];
      }

      const startDate = this.getDateFilter(query.period);

      const where: Prisma.BattleWhereInput = {
        userId,
        ...(query.world && { world: query.world }),
        ...(startDate && { createdAt: { gte: startDate } }),
        warriors: {
          some: {
            originalId: { in: characterIds },
            ph: { gt: 0 },
          },
        },
      };

      const battles = await this.prisma.battle.findMany({
        where,
        include: {
          warriors: {
            where: {
              originalId: { in: characterIds },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      let cumulativePh = 0;
      const result: PhGrowthDataPointDto[] = battles.map((battle) => {
        const userWarrior = battle.warriors[0];
        const ph = userWarrior?.ph ?? 0;
        cumulativePh += ph;

        return {
          date: battle.createdAt.toISOString(),
          ph,
          cumulativePh,
          battleId: battle.id,
        };
      });

      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.ANALYTICS_CACHE_TTL,
      );

      this.logger.log(`PH growth time series calculated for user ${userId} (cached)`);

      return result;
    } catch (error) {
      this.logger.error('Failed to get PH growth time series:', error);
      throw error;
    }
  }
}
