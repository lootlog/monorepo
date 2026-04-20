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
import {
  BattleProcessor,
  type BattleAnalysis,
  type ParsedMove,
  type Warrior,
} from "@lootlog/battle-processor";
import { logger } from "../config/winston.config.js";
import type { CreateBattleInput } from "./schemas/create-battle.schema.js";
import type { QueryBattlesQuery } from "./schemas/query-battles.schema.js";
import type { UpdateBattleInput } from "./schemas/update-battle.schema.js";
import type { PaginationOptions } from "./types/pagination.types.js";
import { BattleAnalytics } from "./battle-analytics.js";
import { BattlePagination } from "./battle-pagination.js";
import { ForbiddenError, NotFoundError } from "../lib/errors/http-errors.js";
import { DrizzleDatabase } from "../shared/drizzle/drizzle-database.js";
import {
  battles,
  battleWarriors,
  userCharacters,
} from "../shared/drizzle/schema.js";
import { BattleArchive } from "../shared/r2/battle-archive.js";
import type {
  BattleWithRelations,
  CreateBattleParams,
  CreateBattleResult,
  DeleteBattleResult,
  GetAllBattlesResult,
  RawBattleData,
} from "./types/battle-store.types.js";

export class BattleStore {
  private readonly loggerWithContext = logger.child({
    context: BattleStore.name,
  });

  constructor(
    private readonly drizzle: DrizzleDatabase,
    private readonly battleArchive: BattleArchive,
    private readonly battlePagination: BattlePagination,
    private readonly battleAnalytics: BattleAnalytics,
  ) {}

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
        accountId: data.accountId,
        characterId: data.characterId,
        world: data.world,
      };

      await this.storeRawBattleData(battle.id, rawBattleData);

      await this.battleAnalytics.invalidateAnalyticsCache(userId);

      return {
        battleId: battle.id,
      };
    } catch (error) {
      this.loggerWithContext.error("Failed to create battle", { userId, error });
      throw new Error(
        `Battle creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getPublicBattles(query: QueryBattlesQuery): Promise<GetAllBattlesResult> {
    try {
      const filterBuilder = await this.buildFilterConditions(query);

      const paginationOptions = this.buildPaginationOptions(query);
      const result = await this.battlePagination.paginateBattles(
        (table) => and(eq(table.public, true), filterBuilder(table)),
        paginationOptions,
      );

      return {
        battles: result.data,
        pagination: result.pagination,
        meta: {
          performance: result.performance,
        },
      };
    } catch (error) {
      this.loggerWithContext.error("Failed to retrieve public battles", { error });
      throw new Error(
        `Failed to retrieve public battles: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getDashboardBattles(
    query: QueryBattlesQuery,
    requestingUserId: string,
  ): Promise<GetAllBattlesResult> {
    try {
      const { userId: _userId, ...filteredQuery } = query;
      const filterBuilder = await this.buildFilterConditions(
        filteredQuery,
        requestingUserId,
      );

      const paginationOptions = this.buildPaginationOptions(query);
      const result = await this.battlePagination.paginateBattles(
        (table) =>
          and(eq(table.userId, requestingUserId), filterBuilder(table)),
        paginationOptions,
      );

      return {
        battles: result.data,
        pagination: result.pagination,
        meta: {
          performance: result.performance,
        },
      };
    } catch (error) {
      this.loggerWithContext.error("Failed to retrieve dashboard battles", {
        error,
      });
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
      this.loggerWithContext.error("Failed to retrieve user characters", { error });
      throw new Error(
        `Failed to retrieve user characters: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getUserWorlds(userId: string): Promise<{ worlds: string[] }> {
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
      this.loggerWithContext.error("Failed to retrieve user worlds", { error });
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
        await this.battleArchive.getBattleData<RawBattleData>(battleId);
      return rawData;
    } catch (error) {
      this.loggerWithContext.error("Failed to retrieve raw battle data", {
        battleId,
        error,
      });
      throw error;
    }
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
      throw new NotFoundError(`Battle with ID ${battleId} not found`);
    }

    return battle;
  }

  async updateBattle(
    battleId: string,
    updateData: UpdateBattleInput,
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
      throw new NotFoundError(`Battle with ID ${battleId} not found`);
    }

    const battle = await this.drizzle.db.query.battles.findFirst({
      where: { id: battleId },
      with: { warriors: true },
    });

    if (!battle) {
      throw new NotFoundError(`Battle with ID ${battleId} not found`);
    }

    return battle;
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
      await this.battleArchive.deleteBattleDataBatch(battleIds);
    } catch (error) {
      this.loggerWithContext.warn("Failed to delete user R2 battle data", {
        userId,
        battleCount: battleIds.length,
        error,
      });
    }

    this.loggerWithContext.info("Deleted user battles", {
      userId,
      battleCount: battleIds.length,
    });

    return { deletedCount: battleIds.length };
  }

  async deleteBattle(battleId: string): Promise<DeleteBattleResult> {
    const deleted = await this.drizzle.db
      .delete(battles)
      .where(eq(battles.id, battleId))
      .returning({ id: battles.id });

    if (deleted.length === 0) {
      throw new NotFoundError(`Battle with ID ${battleId} not found`);
    }

    try {
      await this.battleArchive.deleteBattleData(battleId);
    } catch (error) {
      this.loggerWithContext.warn("Failed to delete battle R2 data", {
        battleId,
        error,
      });
    }

    return { message: "Battle deleted successfully" };
  }

  async getPublicBattle(battleId: string): Promise<BattleWithRelations> {
    const battle = await this.drizzle.db.query.battles.findFirst({
      where: { id: battleId, public: true },
      with: { warriors: true },
    });

    if (!battle) {
      throw new NotFoundError(`Public battle with ID ${battleId} not found`);
    }

    return battle;
  }

  async getPublicBattleRaw(battleId: string): Promise<RawBattleData> {
    const battle = await this.drizzle.db.query.battles.findFirst({
      where: { id: battleId, public: true },
      columns: { id: true },
    });

    if (!battle) {
      throw new NotFoundError(`Public battle with ID ${battleId} not found`);
    }

    return await this.battleArchive.getBattleData(battle.id);
  }

  analyzeBattle(dto: CreateBattleInput): BattleAnalysis {
    try {
      const processor = new BattleProcessor();
      const analysis = processor.processBattle(dto);

      return analysis;
    } catch (error) {
      this.loggerWithContext.error("Failed to analyze battle data", { error });
      throw new Error(
        `Battle analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async buildFilterConditions(
    query: QueryBattlesQuery,
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

      if (query.matchmaking === true) {
        conditions.push(eq(battlesRef.matchmaking, true));
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

  private buildPaginationOptions(query: QueryBattlesQuery): PaginationOptions {
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
      throw new NotFoundError(`Battle with ID ${battleId} not found`);
    }

    if (!battle.public && battle.userId !== requestingUserId) {
      throw new ForbiddenError("Access denied: Battle is private");
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
      this.loggerWithContext.warn("Failed to upsert character", {
        characterId,
        userId,
        error,
      });
    }
  }

  private async storeBattleInDatabase(
    data: CreateBattleInput,
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

      return battle;
    } catch (error) {
      this.loggerWithContext.error("Failed to store battle in database", { error });
      throw new Error(
        `Database storage failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async storeRawBattleData(
    battleId: string,
    data: Omit<CreateBattleInput, "events"> & {
      events: ParsedMove[];
    },
  ): Promise<void> {
    try {
      const rawBattleData: RawBattleData = {
        battleId,
        timestamp: new Date().toISOString(),
        rawData: data,
      };

      await this.battleArchive.uploadBattleData(battleId, rawBattleData);
    } catch (error) {
      this.loggerWithContext.error("Failed to store raw battle data", {
        battleId,
        error,
      });
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
      this.loggerWithContext.error("Failed to search warriors", { error });
      throw error;
    }
  }
}
