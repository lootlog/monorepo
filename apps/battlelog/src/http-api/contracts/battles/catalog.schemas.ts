/** catalog transport definitions for battles. */
import * as Schema from "effect/Schema";
import { DateTimeString, FiniteNumber } from "../scalars.js";

export type BattlesListResponseDto_Output =
  typeof BattlesListResponseDto_Output.Type;

export const BattlesListResponseDto_Output = Schema.Struct({
  battles: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      createdAt: DateTimeString,
      updatedAt: DateTimeString,
      public: Schema.Boolean,
      userId: Schema.String,
      accountId: Schema.String,
      characterId: Schema.String,
      world: Schema.String,
      duration: FiniteNumber,
      type: Schema.String,
      winner: Schema.String,
      loser: Schema.String,
      winningTeam: FiniteNumber,
      losingTeam: FiniteNumber,
      honorPoints: FiniteNumber,
      hasFlee: Schema.Boolean,
      matchmaking: Schema.Boolean,
      statistics: Schema.Struct({
        topDamageDealer: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              warriorId: Schema.String,
              name: Schema.String,
              value: FiniteNumber,
              formattedValue: Schema.optionalKey(Schema.String),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
        topTank: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              warriorId: Schema.String,
              name: Schema.String,
              value: FiniteNumber,
              formattedValue: Schema.optionalKey(Schema.String),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
        bestEfficiency: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              warriorId: Schema.String,
              name: Schema.String,
              value: FiniteNumber,
              formattedValue: Schema.optionalKey(Schema.String),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
        criticalMaster: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              warriorId: Schema.String,
              name: Schema.String,
              value: FiniteNumber,
              formattedValue: Schema.optionalKey(Schema.String),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
        evasionExpert: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              warriorId: Schema.String,
              name: Schema.String,
              value: FiniteNumber,
              formattedValue: Schema.optionalKey(Schema.String),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
        shieldWall: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              warriorId: Schema.String,
              name: Schema.String,
              value: FiniteNumber,
              formattedValue: Schema.optionalKey(Schema.String),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
        damagePerTurn: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              warriorId: Schema.String,
              name: Schema.String,
              value: FiniteNumber,
              formattedValue: Schema.optionalKey(Schema.String),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
        mostActive: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              warriorId: Schema.String,
              name: Schema.String,
              value: FiniteNumber,
              formattedValue: Schema.optionalKey(Schema.String),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
        legendaryWarrior: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              warriorId: Schema.String,
              name: Schema.String,
              value: FiniteNumber,
              formattedValue: Schema.optionalKey(Schema.String),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
        untouchable: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              warriorId: Schema.String,
              name: Schema.String,
              value: FiniteNumber,
              formattedValue: Schema.optionalKey(Schema.String),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
      }),
      difficultyRank: Schema.Union([FiniteNumber, Schema.Null]),
      result: Schema.Union([FiniteNumber, Schema.Null]),
      ratingDelta: Schema.Union([FiniteNumber, Schema.Null]),
      opponentLvl: Schema.Union([FiniteNumber, Schema.Null]),
      opponentOplvl: Schema.Union([FiniteNumber, Schema.Null]),
      opponentRating: Schema.Union([FiniteNumber, Schema.Null]),
      rating: Schema.Union([FiniteNumber, Schema.Null]),
      status: Schema.Union([FiniteNumber, Schema.Null]),
      pointsGained: Schema.Union([FiniteNumber, Schema.Null]),
      placementCur: Schema.Union([FiniteNumber, Schema.Null]),
      placementMax: Schema.Union([FiniteNumber, Schema.Null]),
      dailyStageId: Schema.Union([FiniteNumber, Schema.Null]),
      dailyPointsCur: Schema.Union([FiniteNumber, Schema.Null]),
      dailyPointsMax: Schema.Union([FiniteNumber, Schema.Null]),
      dailyPointsStep: Schema.Union([FiniteNumber, Schema.Null]),
      dailyRewardsLast: Schema.Union([FiniteNumber, Schema.Null]),
      dailyRewardsCur: Schema.Union([FiniteNumber, Schema.Null]),
      dailyRewardsMax: Schema.Union([FiniteNumber, Schema.Null]),
      warriors: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          battleId: Schema.String,
          originalId: Schema.String,
          name: Schema.String,
          lvl: FiniteNumber,
          prof: Schema.String,
          icon: Schema.String,
          team: FiniteNumber,
          turns: FiniteNumber,
          turnsLost: FiniteNumber,
          steps: FiniteNumber,
          normalAttacks: FiniteNumber,
          spellsUsed: FiniteNumber,
          spellsUsedMap: Schema.Record(Schema.String, FiniteNumber),
          isDead: Schema.Boolean,
          surrendered: Schema.Boolean,
          fled: Schema.Boolean,
          maxHp: FiniteNumber,
          damageDealt: FiniteNumber,
          distanceDamage: FiniteNumber,
          meleeDamage: FiniteNumber,
          auxiliaryDamage: FiniteNumber,
          fireDamage: FiniteNumber,
          frostDamage: FiniteNumber,
          lightningDamage: FiniteNumber,
          thirdAttDamage: FiniteNumber,
          damageDealtAfterDefensive: FiniteNumber,
          damageDealtAfterDefensivePercentage: FiniteNumber,
          damageTaken: FiniteNumber,
          distanceDamageTaken: FiniteNumber,
          meleeDamageTaken: FiniteNumber,
          auxiliaryDamageTaken: FiniteNumber,
          fireDamageTaken: FiniteNumber,
          frostDamageTaken: FiniteNumber,
          lightningDamageTaken: FiniteNumber,
          thirdAttDamageTaken: FiniteNumber,
          flatDamageTaken: FiniteNumber,
          rageDamageDealt: FiniteNumber,
          trueDamageDealt: FiniteNumber,
          trueDamageTaken: FiniteNumber,
          stigmaDamageDealt: FiniteNumber,
          stigmaDamageTaken: FiniteNumber,
          passiveHealing: FiniteNumber,
          activeHealing: FiniteNumber,
          armorPierces: FiniteNumber,
          criticalHits: FiniteNumber,
          reducedArmor: FiniteNumber,
          reducedPoisonResistance: FiniteNumber,
          magicResistanceDestroyed: FiniteNumber,
          evasions: FiniteNumber,
          attacksEvaded: FiniteNumber,
          counters: FiniteNumber,
          fastArrows: FiniteNumber,
          blocks: FiniteNumber,
          attacksBlocked: FiniteNumber,
          blockedDamage: FiniteNumber,
          woundDamageTaken: FiniteNumber,
          poisonDamageTaken: FiniteNumber,
          injureDamageTaken: FiniteNumber,
          injures: FiniteNumber,
          critWoundDamageTaken: FiniteNumber,
          firePassiveDamageTaken: FiniteNumber,
          lightningPassiveDamageTaken: FiniteNumber,
          destroyedEnergy: FiniteNumber,
          destroyedMana: FiniteNumber,
          regeneratedEnergy: FiniteNumber,
          regeneratedMana: FiniteNumber,
          reflectedDamage: FiniteNumber,
          reflectedDamageTaken: FiniteNumber,
          legbons: FiniteNumber,
          legbonCurse: FiniteNumber,
          legbonCleanse: FiniteNumber,
          legbonLastheal: FiniteNumber,
          legbonLasthealValue: FiniteNumber,
          legbonGlare: FiniteNumber,
          legbonHolytouch: FiniteNumber,
          legbonHolytouchValue: FiniteNumber,
          legbonCritredValue: FiniteNumber,
          legbonFacadeValue: FiniteNumber,
          legbonPunctureValue: FiniteNumber,
          legbonVerycrit: FiniteNumber,
          legbonAnguish: FiniteNumber,
          legbonAnguishDamageTaken: FiniteNumber,
          ph: FiniteNumber,
        }),
      ),
    }),
  ),
  pagination: Schema.Struct({
    size: FiniteNumber,
    hasNext: Schema.Boolean,
    hasPrev: Schema.Boolean,
    nextCursor: Schema.optionalKey(Schema.String),
    previousCursor: Schema.optionalKey(Schema.String),
    total: Schema.optionalKey(FiniteNumber),
  }),
  meta: Schema.Struct({
    performance: Schema.Struct({
      queryTime: FiniteNumber,
      countTime: Schema.optionalKey(FiniteNumber),
      totalItems: Schema.optionalKey(FiniteNumber),
      estimatedTotal: Schema.optionalKey(Schema.Boolean),
    }),
  }),
}).annotate({ identifier: "BattlesListResponseDto_Output" });

export type BattleCharactersResponseDto_Output =
  typeof BattleCharactersResponseDto_Output.Type;

export const BattleCharactersResponseDto_Output = Schema.Struct({
  characters: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      world: Schema.String,
      icon: Schema.String,
    }),
  ),
}).annotate({ identifier: "BattleCharactersResponseDto_Output" });
