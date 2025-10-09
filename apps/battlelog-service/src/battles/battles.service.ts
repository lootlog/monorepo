import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '../../generated/client';
import type { CreateBattleDto } from 'src/battles/dto/create-battle.dto';
import {
  PaginationStrategy,
  QueryBattlesDto,
  SortField,
  SortOrder,
} from 'src/battles/dto/query-battles.dto';
import type { UpdateBattleDto } from 'src/battles/dto/update-battle.dto';
import type { PaginationOptions } from 'src/battles/interfaces/pagination.interface';
import { PaginationService } from 'src/battles/services/pagination.service';
import { PrismaService } from 'src/shared/modules/prisma/prisma.service';
import { R2Service } from 'src/shared/modules/r2/r2.service';
import {
  BattleAnalysis,
  BattleProcessor,
  ParsedMove,
  type Warrior,
} from './battle-processor';
import type {
  BattleNotFoundError,
  BattleProcessingError,
  BattleWithRelations,
  CreateBattleParams,
  CreateBattleResult,
  DeleteBattleResult,
  GetAllBattlesResult,
  IBattlesService,
  R2StorageError,
  RawBattleData,
} from './interfaces/battle-service.interface';

@Injectable()
export class BattlesService implements IBattlesService {
  private readonly logger = new Logger(BattlesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
    private readonly paginationService: PaginationService,
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

      this.logger.log(
        `Battle ${battle.id} created successfully for user ${userId}`,
      );

      return {
        battleId: battle.id,
        analysis,
        battle: {
          id: battle.id,
          createdAt: battle.createdAt,
          public: battle.public,
        },
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
      const where = this.buildFilterConditions(query);
      where.public = true;

      const paginationOptions = this.buildPaginationOptions(query);
      const result = await this.paginationService.paginateBattles(
        where,
        paginationOptions,
      );

      this.logger.log(
        `Paginated public battles using ${result.strategy} strategy in ${result.performance.queryTime}ms`,
      );

      return {
        battles: result.data,
        pagination: result.pagination,
        meta: {
          strategy: result.strategy,
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
      const where = this.buildFilterConditions(query);
      where.userId = requestingUserId;

      const paginationOptions = this.buildPaginationOptions(query);
      const result = await this.paginationService.paginateBattles(
        where,
        paginationOptions,
      );

      this.logger.log(
        `Paginated dashboard battles for user ${requestingUserId} using ${result.strategy} strategy in ${result.performance.queryTime}ms`,
      );

      return {
        battles: result.data,
        pagination: result.pagination,
        meta: {
          strategy: result.strategy,
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

      const battle = await this.prisma.battle.findUniqueOrThrow({
        where: { id: battleId },
        include: {
          warriors: true,
        },
      });

      return battle;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Battle with ID ${battleId} not found`);
      }
      if (error instanceof Error && error.name === 'NotFoundError') {
        throw new NotFoundException(`Battle with ID ${battleId} not found`);
      }
      this.logger.error(
        'Failed to retrieve battle from database',
        error instanceof Error ? error.stack : error,
      );
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
        include: {
          warriors: true,
        },
      });

      this.logger.log(
        `Battle ${battleId} updated successfully (public: ${updateData.public})`,
      );
      return battle;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        this.logger.warn(`Battle ${battleId} not found for update`);
        throw new NotFoundException(`Battle with ID ${battleId} not found`);
      }

      this.logger.error(`Failed to update battle ${battleId}:`, error);
      throw new Error(
        `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async deleteBattle(battleId: string): Promise<DeleteBattleResult> {
    try {
      await this.prisma.battle.delete({
        where: { id: battleId },
      });

      try {
        await this.r2Service.deleteBattleData(battleId);
        this.logger.debug(`R2 data deleted for battle ${battleId}`);
      } catch (r2Error) {
        this.logger.warn(
          `Failed to delete R2 data for battle ${battleId}:`,
          r2Error,
        );
      }

      this.logger.log(`Battle ${battleId} deleted successfully`);
      return { message: 'Battle deleted successfully' };
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        this.logger.warn(`Battle ${battleId} not found for deletion`);
        throw new NotFoundException(`Battle with ID ${battleId} not found`);
      }

      this.logger.error(`Failed to delete battle ${battleId}:`, error);
      throw new Error(
        `Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getPublicBattle(battleId: string): Promise<BattleWithRelations> {
    try {
      const battle = await this.prisma.battle.findUniqueOrThrow({
        where: { id: battleId, public: true },
        include: {
          warriors: true,
        },
      });

      return battle;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Public battle with ID ${battleId} not found`,
        );
      }
      if (error instanceof Error && error.name === 'NotFoundError') {
        throw new NotFoundException(
          `Public battle with ID ${battleId} not found`,
        );
      }
      this.logger.error(
        'Failed to retrieve public battle',
        error instanceof Error ? error.stack : error,
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Public battle with ID ${battleId} not found`,
        );
      }
      if (error instanceof Error && error.name === 'NotFoundError') {
        throw new NotFoundException(
          `Public battle with ID ${battleId} not found`,
        );
      }
      this.logger.error(
        'Failed to retrieve public battle raw data',
        error instanceof Error ? error.stack : error,
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

  private buildFilterConditions(
    query: QueryBattlesDto,
  ): Prisma.BattleWhereInput {
    const where: Prisma.BattleWhereInput = {};

    if (query.world) where.world = query.world;
    if (query.type) where.type = query.type;
    if (query.userId) where.userId = query.userId;
    if (typeof query.public === 'boolean') where.public = query.public;
    if (query.characterId) where.characterId = query.characterId;

    if (query.search) {
      where.warriors = {
        some: {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      };
    }

    return where;
  }

  private buildPaginationOptions(query: QueryBattlesDto): PaginationOptions {
    return {
      strategy: query.strategy ?? PaginationStrategy.AUTO,
      sortField: query.sortBy ?? SortField.CREATED_AT,
      sortOrder: query.sortOrder ?? SortOrder.DESC,
      includeTotal: query.includeTotal ?? true,
      estimateTotal: query.estimateTotal ?? false,

      page: query.page,
      limit: query.limit,

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
        throw new ForbiddenException(
          'Access denied: Battle is private and you are not the owner',
        );
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Battle with ID ${battleId} not found`);
      }
      if (error instanceof Error && error.name === 'NotFoundError') {
        throw new NotFoundException(`Battle with ID ${battleId} not found`);
      }
      throw error;
    }
  }

  private async storeBattleInDatabase(
    data: CreateBattleDto,
    userId: string,
    analysis: BattleAnalysis,
  ): Promise<BattleWithRelations> {
    try {
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
}
