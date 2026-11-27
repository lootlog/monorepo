import {
  ApplicationError,
  InvalidRequestError,
} from "@lootlog/protocol/http/errors";
import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { ContextLogger } from "@lootlog/instrumentation";
import { and, eq, gte, lt } from "drizzle-orm";
import { Clock, Effect } from "effect";
import type { CreateBattleInput } from "#src/battles/submission/create-battle";
import type { BattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import type { BattleMetadata } from "#src/battles/catalog/battle-metadata.service";
import type { DrizzleDatabase } from "#src/database/database";
import {
  battles,
  battleSubmissions,
  battleRecordedOutbox,
  battleTimelines,
  battleWarriorFilters,
  battleWarriors,
} from "#src/database/schema";
import { encodeBattleEvents } from "#src/battles/battle-timeline";
import { createBattleId, firstBattleIdAt } from "#src/battles/battle-id";
import type {
  BattleDeduplication,
  BattleDeduplicationTiming,
} from "#src/battles/submission/battle-deduplication";
import {
  createBattleSemanticFingerprint,
  normalizeBattleSubmission,
} from "#src/battles/submission/battle-submission";
import { calculateBattleDuration } from "@lootlog/battle-processor/battle-log";
import {
  BattleProcessor,
  type BattleAnalysis,
} from "@lootlog/battle-processor/battle-processor";
import type { Warrior } from "@lootlog/battle-processor/warrior";
import type { BattleRecordedV1 } from "@lootlog/protocol/rabbit/events";
import type { CreateBattleParams } from "#src/battles/battle-service";

type BattleCreationDatabase = Pick<
  DrizzleDatabase,
  "select" | "update" | "transaction"
> & {
  query: {
    battles: Pick<DrizzleDatabase["query"]["battles"], "findFirst">;
  };
};

const battleRecordedFact = (
  data: CreateBattleParams["data"],
  userId: string,
  analysis: BattleAnalysis,
  battle: { readonly id: string; readonly createdAt: Date },
): BattleRecordedV1 => {
  const userWarrior = analysis.warriors.find(
    (warrior) => warrior.originalId === data.characterId,
  );

  return {
    version: 1,
    battleId: battle.id,
    userId,
    accountId: data.accountId,
    characterId: data.characterId,
    world: data.world,
    battleType: analysis.type,
    matchmaking: Boolean(analysis.matchmaking),
    won:
      userWarrior !== undefined &&
      analysis.outcome.winningTeam > 0 &&
      userWarrior.team === analysis.outcome.winningTeam,
    unfinished: analysis.outcome.unfinished,
    hasFlee: analysis.outcome.hasFlee,
    occurredAt: battle.createdAt.toISOString(),
  };
};

export const makeBattleCreation = (
  drizzle: BattleCreationDatabase,
  battleAnalyticsService: Pick<BattleAnalytics, "invalidateAnalyticsCache">,
  battleMetadataService: Pick<BattleMetadata, "upsertUserCharacter">,
  deduplication: BattleDeduplication,
  deduplicationTiming: Pick<BattleDeduplicationTiming, "cacheTtlSeconds">,
  battleRecordedQueued: Effect.Effect<void> = Effect.void,
) => {
  const logger = new ContextLogger("Battles");

  const preserveCanonicalBattleDuration = (
    battleId: string,
    duration: number,
    userId: string,
  ) => {
    if (duration <= 0) return Effect.void;

    return drizzle
      .update(battles)
      .set({ duration, updatedAt: new Date() })
      .where(and(eq(battles.id, battleId), lt(battles.duration, duration)))
      .returning({ id: battles.id })
      .pipe(
        withAdapterSpan("Battles_preserveDuration", "battlelog-infrastructure"),
        Effect.flatMap((updated) =>
          updated.length > 0
            ? battleAnalyticsService.invalidateAnalyticsCache(userId)
            : Effect.void,
        ),
      );
  };

  const getRecentBattleIdBySemanticFingerprint = (
    semanticFingerprint: string,
    userId: string,
  ) => {
    return Clock.currentTimeMillis.pipe(
      Effect.flatMap((now) =>
        drizzle.query.battles
          .findFirst({
            where: {
              semanticFingerprint,
              userId,
              RAW: (table) =>
                gte(
                  table.id,
                  firstBattleIdAt(
                    new Date(now - deduplicationTiming.cacheTtlSeconds * 1_000),
                  ),
                ),
            },
            columns: { id: true },
            orderBy: { id: "desc" },
          })
          .pipe(
            withAdapterSpan(
              "Battles_findRecentFingerprint",
              "battlelog-infrastructure",
            ),
          ),
      ),
      Effect.map((battle) => battle?.id ?? null),
    );
  };

  const getMatchingBattleBySubmissionId = (
    submissionId: string | undefined,
    userId: string,
    semanticFingerprint: string,
  ) => {
    if (!submissionId) {
      return Effect.succeed(null);
    }

    return drizzle
      .select({
        id: battles.id,
        semanticFingerprint: battles.semanticFingerprint,
      })
      .from(battleSubmissions)
      .innerJoin(
        battles,
        and(
          eq(battles.id, battleSubmissions.battleId),
          eq(battles.userId, battleSubmissions.userId),
        ),
      )
      .where(
        and(
          eq(battleSubmissions.userId, userId),
          eq(battleSubmissions.submissionId, submissionId),
        ),
      )
      .limit(1)
      .pipe(
        withAdapterSpan("Battles_findSubmission", "battlelog-infrastructure"),
        Effect.flatMap(([battle]) => {
          if (
            battle &&
            battle.semanticFingerprint !== null &&
            battle.semanticFingerprint !== semanticFingerprint
          ) {
            return Effect.fail(
              new InvalidRequestError(
                "Submission ID is already used for a different battle",
              ),
            );
          }

          return Effect.succeed(battle ?? null);
        }),
      );
  };

  const analyzeBattle = (dto: CreateBattleInput): BattleAnalysis => {
    try {
      const processor = new BattleProcessor("statistics");
      const analysis = processor.processBattle(dto);

      return analysis;
    } catch (error) {
      logger.error("Failed to analyze battle data:", error);
      throw new Error("Battle analysis failed", { cause: error });
    }
  };

  const storeBattleInDatabase = (
    data: CreateBattleInput,
    userId: string,
    analysis: BattleAnalysis,
    semanticFingerprint: string,
  ) => {
    const store = Effect.gen(function* () {
      const userWarrior = analysis.warriors.find(
        (w) => w.originalId === data.characterId,
      );

      const [, battle] = yield* Effect.all(
        [
          userWarrior
            ? battleMetadataService.upsertUserCharacter({
                userId,
                characterId: data.characterId,
                name: userWarrior.name,
                world: data.world,
                icon: userWarrior.icon,
              })
            : Effect.void,
          drizzle
            .transaction((tx) =>
              Effect.gen(function* () {
                const now = yield* Clock.currentTimeMillis;
                const battleId = createBattleId(now);

                if (data.submissionId) {
                  const [claimed] = yield* tx
                    .insert(battleSubmissions)
                    .values({
                      userId,
                      submissionId: data.submissionId,
                      battleId: battleId.id,
                    })
                    .onConflictDoNothing()
                    .returning({ battleId: battleSubmissions.battleId });

                  if (!claimed) return null;
                }

                yield* tx.insert(battles).values({
                  ...battleId,
                  userId,
                  updatedAt: new Date(now),
                  accountId: data.accountId,
                  characterId: data.characterId,
                  semanticFingerprint,
                  world: data.world,
                  duration: analysis.duration,
                  type: analysis.type,
                  winner: analysis.outcome.winner,
                  loser: analysis.outcome.loser,
                  winningTeam: analysis.outcome.winningTeam,
                  losingTeam: analysis.outcome.losingTeam,
                  hasFlee: analysis.outcome.hasFlee,
                  unfinished: analysis.outcome.unfinished,
                  matchmaking: !!analysis.matchmaking,
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
                });

                const warriorValues = analysis.warriors.map(
                  (warrior: Warrior) => ({
                    battleId: battleId.id,
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
                    damageDealtAfterDefensive:
                      warrior.damageDealtAfterDefensive,
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
                    lightningPassiveDamageTaken:
                      warrior.lightningPassiveDamageTaken,
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
                );

                yield* tx.insert(battleWarriors).values(warriorValues);
                yield* tx.insert(battleWarriorFilters).values(
                  warriorValues.map((warrior) => ({
                    userId,
                    battleId: warrior.battleId,
                    originalId: warrior.originalId,
                    name: warrior.name,
                    lvl: warrior.lvl,
                    ph: warrior.ph,
                    team: warrior.team,
                  })),
                );
                yield* tx.insert(battleTimelines).values({
                  battleId: battleId.id,
                  userId,
                  events: encodeBattleEvents(data.events),
                });
                yield* tx.insert(battleRecordedOutbox).values({
                  event: battleRecordedFact(data, userId, analysis, battleId),
                });

                return { id: battleId.id, created: true };
              }),
            )
            .pipe(
              withAdapterSpan(
                "Battles_storeTransaction",
                "battlelog-infrastructure",
              ),
            ),
        ],
        { concurrency: "unbounded" },
      );

      if (battle) return battle;

      const existingBattle = yield* getMatchingBattleBySubmissionId(
        data.submissionId,
        userId,
        semanticFingerprint,
      );

      if (existingBattle) {
        return { id: existingBattle.id, created: false };
      }

      return yield* Effect.die(new Error("Battle insert did not return a row"));
    });

    return store.pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          if (error instanceof ApplicationError) return;

          logger.error("Failed to store battle in database:", error);
        }),
      ),
    );
  };

  const createCanonicalBattle = ({
    data,
    semanticFingerprint,
    userId,
    existingBattleId,
  }: {
    data: CreateBattleInput;
    semanticFingerprint: string;
    userId: string;
    existingBattleId?: string;
  }) => {
    return Effect.gen(function* () {
      const canonicalBattleId =
        existingBattleId ??
        (yield* getRecentBattleIdBySemanticFingerprint(
          semanticFingerprint,
          userId,
        ));

      if (canonicalBattleId) {
        yield* preserveCanonicalBattleDuration(
          canonicalBattleId,
          calculateBattleDuration(data.events),
          userId,
        );

        return { battleId: canonicalBattleId };
      }

      const analysis = analyzeBattle(data);

      const stored = yield* storeBattleInDatabase(
        data,
        userId,
        analysis,
        semanticFingerprint,
      );

      yield* battleAnalyticsService.invalidateAnalyticsCache(userId);

      if (stored.created) yield* battleRecordedQueued;

      return { battleId: stored.id };
    });
  };

  const createBattle = (params: CreateBattleParams) => {
    const { data, userId } = params;

    return Effect.gen(function* () {
      const normalizedData = normalizeBattleSubmission(data);

      const semanticFingerprint = createBattleSemanticFingerprint({
        data: normalizedData,
        userId,
      });

      const existingSubmission = yield* getMatchingBattleBySubmissionId(
        normalizedData.submissionId,
        userId,
        semanticFingerprint,
      );

      if (existingSubmission?.semanticFingerprint === null) {
        return { battleId: existingSubmission.id };
      }

      if (existingSubmission) {
        return yield* createCanonicalBattle({
          data: normalizedData,
          semanticFingerprint,
          userId,
          existingBattleId: existingSubmission.id,
        });
      }

      return yield* deduplication.runBattleCreationSingleFlight(
        semanticFingerprint,
        () =>
          createCanonicalBattle({
            data: normalizedData,
            semanticFingerprint,
            userId,
          }),
        (result) =>
          preserveCanonicalBattleDuration(
            result.battleId,
            calculateBattleDuration(normalizedData.events),
            userId,
          ),
      );
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          if (error instanceof ApplicationError) return;

          logger.error(`Failed to create battle for user ${userId}:`, error);
        }),
      ),
    );
  };

  return { createBattle };
};
