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
import type { UpdateBattleDto } from 'src/battles/dto/update-battle.dto';
import type { PaginationOptions } from 'src/battles/interfaces/pagination.interface';
import { BattleAnalyticsService } from 'src/battles/services/battle-analytics.service';
import { PaginationService } from 'src/battles/services/pagination.service';
import { PrismaService } from 'src/shared/modules/prisma/prisma.service';
import { R2Service } from 'src/shared/modules/r2/r2.service';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
    private readonly paginationService: PaginationService,
    private readonly battleAnalyticsService: BattleAnalyticsService,
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

      await this.battleAnalyticsService.invalidateAnalyticsCache(userId);

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
}
