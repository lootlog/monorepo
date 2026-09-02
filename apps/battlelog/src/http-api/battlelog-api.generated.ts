import * as Schema from "effect/Schema";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  OpenApi,
} from "effect/unstable/httpapi";
// non-recursive definitions
export type CreateBattleDto = {
  readonly accountId: string;
  readonly characterId: string;
  readonly submissionId?: string;
  readonly world: string;
  readonly matchmaking?: boolean;
  readonly events: ReadonlyArray<{
    readonly party?: {
      readonly members: {
        readonly [x: string]: {
          readonly id: number;
          readonly account: number;
          readonly nick: string;
          readonly icon: string;
          readonly commander?: number;
        };
      };
    };
    readonly f: {
      readonly m?: ReadonlyArray<string>;
      readonly endBattle?: number;
      readonly init?: string;
      readonly auto?: string;
      readonly w?: {
        readonly [x: string]: {
          readonly originalId: number;
          readonly name: string;
          readonly lvl: number;
          readonly prof: string;
          readonly icon: string;
          readonly team: number;
        };
      };
    };
    readonly ev?: number;
    readonly match_summary?: {
      readonly difficulty_rank: number;
      readonly result: number;
      readonly rating_delta: number;
      readonly opponent_lvl: number;
      readonly opponent_oplvl: number;
      readonly opponent_rating: number;
      readonly rating: number;
      readonly status: number;
      readonly placement_cur?: number;
      readonly placement_max?: number;
      readonly points_gained?: number;
      readonly daily_stage?: {
        readonly id: number;
        readonly points_cur: number;
        readonly points_max: number;
        readonly points_step: number;
        readonly rewards_last: number;
        readonly rewards_cur: number;
        readonly rewards_max: number;
      };
    };
    readonly matchmaking_state?: number;
  }>;
};
export const CreateBattleDto = Schema.Struct({
  accountId: Schema.String,
  characterId: Schema.String,
  submissionId: Schema.optionalKey(
    Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(128).annotate({
        expected: "a value with a length of at most 128",
      }),
    ),
  ),
  world: Schema.String,
  matchmaking: Schema.optionalKey(Schema.Boolean),
  events: Schema.Array(
    Schema.Struct({
      party: Schema.optionalKey(
        Schema.Struct({
          members: Schema.Record(
            Schema.String,
            Schema.Struct({
              id: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              account: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              nick: Schema.String,
              icon: Schema.String,
              commander: Schema.optionalKey(
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
              ),
            }),
          ),
        }),
      ),
      f: Schema.Struct({
        m: Schema.optionalKey(Schema.Array(Schema.String)),
        endBattle: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        init: Schema.optionalKey(Schema.String),
        auto: Schema.optionalKey(Schema.String),
        w: Schema.optionalKey(
          Schema.Record(
            Schema.String,
            Schema.Struct({
              originalId: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              name: Schema.String,
              lvl: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              prof: Schema.String,
              icon: Schema.String,
              team: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
            }),
          ),
        ),
      }),
      ev: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      match_summary: Schema.optionalKey(
        Schema.Struct({
          difficulty_rank: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          result: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          rating_delta: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          opponent_lvl: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          opponent_oplvl: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          opponent_rating: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          rating: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          status: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          placement_cur: Schema.optionalKey(
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
          ),
          placement_max: Schema.optionalKey(
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
          ),
          points_gained: Schema.optionalKey(
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
          ),
          daily_stage: Schema.optionalKey(
            Schema.Struct({
              id: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              points_cur: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              points_max: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              points_step: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              rewards_last: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              rewards_cur: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              rewards_max: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
            }),
          ),
        }),
      ),
      matchmaking_state: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
    }),
  ).check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
}).annotate({ identifier: "CreateBattleDto" });
export type BattleCreatedResponseDto_Output = { readonly battleId: string };
export const BattleCreatedResponseDto_Output = Schema.Struct({
  battleId: Schema.String,
}).annotate({ identifier: "BattleCreatedResponseDto_Output" });
export type BattlesListResponseDto_Output = {
  readonly battles: ReadonlyArray<{
    readonly id: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly public: boolean;
    readonly userId: string;
    readonly accountId: string;
    readonly characterId: string;
    readonly world: string;
    readonly duration: number;
    readonly type: string;
    readonly winner: string;
    readonly loser: string;
    readonly winningTeam: number;
    readonly losingTeam: number;
    readonly honorPoints: number;
    readonly hasFlee: boolean;
    readonly matchmaking: boolean;
    readonly statistics: {
      readonly topDamageDealer:
        | ({
            readonly warriorId: string;
            readonly name: string;
            readonly value: number;
            readonly formattedValue?: string;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly topTank:
        | ({
            readonly warriorId: string;
            readonly name: string;
            readonly value: number;
            readonly formattedValue?: string;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly bestEfficiency:
        | ({
            readonly warriorId: string;
            readonly name: string;
            readonly value: number;
            readonly formattedValue?: string;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly criticalMaster:
        | ({
            readonly warriorId: string;
            readonly name: string;
            readonly value: number;
            readonly formattedValue?: string;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly evasionExpert:
        | ({
            readonly warriorId: string;
            readonly name: string;
            readonly value: number;
            readonly formattedValue?: string;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly shieldWall:
        | ({
            readonly warriorId: string;
            readonly name: string;
            readonly value: number;
            readonly formattedValue?: string;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly damagePerTurn:
        | ({
            readonly warriorId: string;
            readonly name: string;
            readonly value: number;
            readonly formattedValue?: string;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly mostActive:
        | ({
            readonly warriorId: string;
            readonly name: string;
            readonly value: number;
            readonly formattedValue?: string;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly legendaryWarrior:
        | ({
            readonly warriorId: string;
            readonly name: string;
            readonly value: number;
            readonly formattedValue?: string;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly untouchable:
        | ({
            readonly warriorId: string;
            readonly name: string;
            readonly value: number;
            readonly formattedValue?: string;
          } & { readonly [x: string]: Schema.Json })
        | null;
    };
    readonly difficultyRank: number | null;
    readonly result: number | null;
    readonly ratingDelta: number | null;
    readonly opponentLvl: number | null;
    readonly opponentOplvl: number | null;
    readonly opponentRating: number | null;
    readonly rating: number | null;
    readonly status: number | null;
    readonly pointsGained: number | null;
    readonly placementCur: number | null;
    readonly placementMax: number | null;
    readonly dailyStageId: number | null;
    readonly dailyPointsCur: number | null;
    readonly dailyPointsMax: number | null;
    readonly dailyPointsStep: number | null;
    readonly dailyRewardsLast: number | null;
    readonly dailyRewardsCur: number | null;
    readonly dailyRewardsMax: number | null;
    readonly warriors: ReadonlyArray<{
      readonly id: string;
      readonly battleId: string;
      readonly originalId: string;
      readonly name: string;
      readonly lvl: number;
      readonly prof: string;
      readonly icon: string;
      readonly team: number;
      readonly turns: number;
      readonly turnsLost: number;
      readonly steps: number;
      readonly normalAttacks: number;
      readonly spellsUsed: number;
      readonly spellsUsedMap: { readonly [x: string]: number };
      readonly isDead: boolean;
      readonly surrendered: boolean;
      readonly fled: boolean;
      readonly maxHp: number;
      readonly damageDealt: number;
      readonly distanceDamage: number;
      readonly meleeDamage: number;
      readonly auxiliaryDamage: number;
      readonly fireDamage: number;
      readonly frostDamage: number;
      readonly lightningDamage: number;
      readonly thirdAttDamage: number;
      readonly damageDealtAfterDefensive: number;
      readonly damageDealtAfterDefensivePercentage: number;
      readonly damageTaken: number;
      readonly distanceDamageTaken: number;
      readonly meleeDamageTaken: number;
      readonly auxiliaryDamageTaken: number;
      readonly fireDamageTaken: number;
      readonly frostDamageTaken: number;
      readonly lightningDamageTaken: number;
      readonly thirdAttDamageTaken: number;
      readonly flatDamageTaken: number;
      readonly rageDamageDealt: number;
      readonly trueDamageDealt: number;
      readonly trueDamageTaken: number;
      readonly stigmaDamageDealt: number;
      readonly stigmaDamageTaken: number;
      readonly passiveHealing: number;
      readonly activeHealing: number;
      readonly armorPierces: number;
      readonly criticalHits: number;
      readonly reducedArmor: number;
      readonly reducedPoisonResistance: number;
      readonly magicResistanceDestroyed: number;
      readonly evasions: number;
      readonly attacksEvaded: number;
      readonly counters: number;
      readonly fastArrows: number;
      readonly blocks: number;
      readonly attacksBlocked: number;
      readonly blockedDamage: number;
      readonly woundDamageTaken: number;
      readonly poisonDamageTaken: number;
      readonly injureDamageTaken: number;
      readonly injures: number;
      readonly critWoundDamageTaken: number;
      readonly firePassiveDamageTaken: number;
      readonly lightningPassiveDamageTaken: number;
      readonly destroyedEnergy: number;
      readonly destroyedMana: number;
      readonly regeneratedEnergy: number;
      readonly regeneratedMana: number;
      readonly reflectedDamage: number;
      readonly reflectedDamageTaken: number;
      readonly legbons: number;
      readonly legbonCurse: number;
      readonly legbonCleanse: number;
      readonly legbonLastheal: number;
      readonly legbonLasthealValue: number;
      readonly legbonGlare: number;
      readonly legbonHolytouch: number;
      readonly legbonHolytouchValue: number;
      readonly legbonCritredValue: number;
      readonly legbonFacadeValue: number;
      readonly legbonPunctureValue: number;
      readonly legbonVerycrit: number;
      readonly legbonAnguish: number;
      readonly legbonAnguishDamageTaken: number;
      readonly ph: number;
    }>;
  }>;
  readonly pagination: {
    readonly size: number;
    readonly hasNext: boolean;
    readonly hasPrev: boolean;
    readonly nextCursor?: string;
    readonly previousCursor?: string;
    readonly total?: number;
  };
  readonly meta: {
    readonly performance: {
      readonly queryTime: number;
      readonly countTime?: number;
      readonly totalItems?: number;
      readonly estimatedTotal?: boolean;
    };
  };
};
export const BattlesListResponseDto_Output = Schema.Struct({
  battles: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      createdAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      updatedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      public: Schema.Boolean,
      userId: Schema.String,
      accountId: Schema.String,
      characterId: Schema.String,
      world: Schema.String,
      duration: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      type: Schema.String,
      winner: Schema.String,
      loser: Schema.String,
      winningTeam: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      losingTeam: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      honorPoints: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      hasFlee: Schema.Boolean,
      matchmaking: Schema.Boolean,
      statistics: Schema.Struct({
        topDamageDealer: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              warriorId: Schema.String,
              name: Schema.String,
              value: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
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
              value: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
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
              value: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
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
              value: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
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
              value: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
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
              value: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
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
              value: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
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
              value: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
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
              value: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
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
              value: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
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
      difficultyRank: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      result: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      ratingDelta: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      opponentLvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      opponentOplvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      opponentRating: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      rating: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      status: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      pointsGained: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      placementCur: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      placementMax: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      dailyStageId: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      dailyPointsCur: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      dailyPointsMax: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      dailyPointsStep: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      dailyRewardsLast: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      dailyRewardsCur: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      dailyRewardsMax: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      warriors: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          battleId: Schema.String,
          originalId: Schema.String,
          name: Schema.String,
          lvl: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          prof: Schema.String,
          icon: Schema.String,
          team: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          turns: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          turnsLost: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          steps: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          normalAttacks: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          spellsUsed: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          spellsUsedMap: Schema.Record(
            Schema.String,
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
          ),
          isDead: Schema.Boolean,
          surrendered: Schema.Boolean,
          fled: Schema.Boolean,
          maxHp: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          damageDealt: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          distanceDamage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          meleeDamage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          auxiliaryDamage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          fireDamage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          frostDamage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          lightningDamage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          thirdAttDamage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          damageDealtAfterDefensive: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          damageDealtAfterDefensivePercentage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          damageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          distanceDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          meleeDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          auxiliaryDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          fireDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          frostDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          lightningDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          thirdAttDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          flatDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          rageDamageDealt: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          trueDamageDealt: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          trueDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          stigmaDamageDealt: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          stigmaDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          passiveHealing: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          activeHealing: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          armorPierces: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          criticalHits: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          reducedArmor: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          reducedPoisonResistance: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          magicResistanceDestroyed: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          evasions: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          attacksEvaded: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          counters: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          fastArrows: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          blocks: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          attacksBlocked: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          blockedDamage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          woundDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          poisonDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          injureDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          injures: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          critWoundDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          firePassiveDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          lightningPassiveDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          destroyedEnergy: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          destroyedMana: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          regeneratedEnergy: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          regeneratedMana: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          reflectedDamage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          reflectedDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbons: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonCurse: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonCleanse: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonLastheal: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonLasthealValue: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonGlare: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonHolytouch: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonHolytouchValue: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonCritredValue: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonFacadeValue: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonPunctureValue: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonVerycrit: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonAnguish: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legbonAnguishDamageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          ph: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        }),
      ),
    }),
  ),
  pagination: Schema.Struct({
    size: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    hasNext: Schema.Boolean,
    hasPrev: Schema.Boolean,
    nextCursor: Schema.optionalKey(Schema.String),
    previousCursor: Schema.optionalKey(Schema.String),
    total: Schema.optionalKey(
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    ),
  }),
  meta: Schema.Struct({
    performance: Schema.Struct({
      queryTime: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      countTime: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      totalItems: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      estimatedTotal: Schema.optionalKey(Schema.Boolean),
    }),
  }),
}).annotate({ identifier: "BattlesListResponseDto_Output" });
export type BattleCharactersResponseDto_Output = {
  readonly characters: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly world: string;
    readonly icon: string;
  }>;
};
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
export type BattleAnalyticsResponseDto_Output = {
  readonly totalBattles: number;
  readonly wins: number;
  readonly losses: number;
  readonly winRatio: number;
  readonly totalPH: number;
};
export const BattleAnalyticsResponseDto_Output = Schema.Struct({
  totalBattles: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  wins: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  losses: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  winRatio: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  totalPH: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
}).annotate({ identifier: "BattleAnalyticsResponseDto_Output" });
export type AbyssSeasonResponseDto_Output = {
  readonly id: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly totalBattles: number;
  readonly wins: number;
  readonly losses: number;
  readonly winRate: number;
  readonly totalRatingDelta: number;
  readonly peakRating: number | null;
  readonly totalPointsGained: number | null;
};
export const AbyssSeasonResponseDto_Output = Schema.Struct({
  id: Schema.String,
  startedAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  endedAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  totalBattles: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  wins: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  losses: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  winRate: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  totalRatingDelta: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  peakRating: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  totalPointsGained: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
}).annotate({ identifier: "AbyssSeasonResponseDto_Output" });
export type CombatProfileResponseDto_Output = {
  readonly summary: {
    readonly totalBattles: number;
    readonly wins: number;
    readonly losses: number;
    readonly winRate: number;
    readonly totalPH: number;
    readonly totalRatingDelta: number;
    readonly avgTurns: number;
    readonly avgDuration: number;
    readonly damagePerTurn: number;
    readonly mitigationRate: number;
    readonly controlRate: number;
  };
  readonly damageMix: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly value: number;
    readonly share: number;
  }>;
  readonly mitigationMix: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly value: number;
    readonly share: number;
  }>;
  readonly spellUsage: ReadonlyArray<{
    readonly spell: string;
    readonly skillId: number | null;
    readonly casts: number;
    readonly share: number;
  }>;
  readonly matchupByProfession: ReadonlyArray<{
    readonly prof: string;
    readonly wins: number;
    readonly losses: number;
    readonly totalBattles: number;
    readonly winRate: number;
  }>;
  readonly phTrend: ReadonlyArray<{
    readonly date: string;
    readonly value: number;
    readonly cumulativeValue: number;
    readonly battleId: string;
  }>;
  readonly ratingTrend: ReadonlyArray<{
    readonly date: string;
    readonly value: number;
    readonly cumulativeValue: number;
    readonly battleId: string;
  }>;
  readonly highlights: ReadonlyArray<{
    readonly battleId: string;
    readonly createdAt: string;
    readonly type: string;
    readonly label: string;
    readonly value: number;
  }>;
};
export const CombatProfileResponseDto_Output = Schema.Struct({
  summary: Schema.Struct({
    totalBattles: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    wins: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    losses: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    winRate: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalPH: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalRatingDelta: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    avgTurns: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    avgDuration: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    damagePerTurn: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    mitigationRate: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    controlRate: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  }),
  damageMix: Schema.Array(
    Schema.Struct({
      key: Schema.String,
      label: Schema.String,
      value: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      share: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
  mitigationMix: Schema.Array(
    Schema.Struct({
      key: Schema.String,
      label: Schema.String,
      value: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      share: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
  spellUsage: Schema.Array(
    Schema.Struct({
      spell: Schema.String,
      skillId: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      casts: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      share: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
  matchupByProfession: Schema.Array(
    Schema.Struct({
      prof: Schema.String,
      wins: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      losses: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      totalBattles: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      winRate: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
  phTrend: Schema.Array(
    Schema.Struct({
      date: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      value: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      cumulativeValue: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      battleId: Schema.String,
    }),
  ),
  ratingTrend: Schema.Array(
    Schema.Struct({
      date: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      value: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      cumulativeValue: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      battleId: Schema.String,
    }),
  ),
  highlights: Schema.Array(
    Schema.Struct({
      battleId: Schema.String,
      createdAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      type: Schema.String,
      label: Schema.String,
      value: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
}).annotate({ identifier: "CombatProfileResponseDto_Output" });
export type ProfessionWinRateResponseDto_Output = {
  readonly prof: string;
  readonly wins: number;
  readonly losses: number;
  readonly totalBattles: number;
  readonly winRate: number;
};
export const ProfessionWinRateResponseDto_Output = Schema.Struct({
  prof: Schema.String,
  wins: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  losses: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  totalBattles: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  winRate: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
}).annotate({ identifier: "ProfessionWinRateResponseDto_Output" });
export type HeadToHeadPaginatedResponseDto_Output = {
  readonly records: ReadonlyArray<{
    readonly opponentId: string;
    readonly opponentName: string;
    readonly opponentIcon: string;
    readonly opponentProf: string;
    readonly opponentLvl: number;
    readonly lastBattleResult: "won" | "lost" | "flee";
    readonly lastBattleUserWarrior: {
      readonly name: string;
      readonly lvl: number;
      readonly prof: string;
      readonly icon: string;
      readonly fireDamage: number;
      readonly frostDamage: number;
      readonly lightningDamage: number;
      readonly poisonDamageTaken: number;
      readonly woundDamageTaken: number;
      readonly critWoundDamageTaken: number;
    };
    readonly lastBattleOpponentWarrior: {
      readonly name: string;
      readonly lvl: number;
      readonly prof: string;
      readonly icon: string;
      readonly fireDamage: number;
      readonly frostDamage: number;
      readonly lightningDamage: number;
      readonly poisonDamageTaken: number;
      readonly woundDamageTaken: number;
      readonly critWoundDamageTaken: number;
    };
    readonly wins: number;
    readonly losses: number;
    readonly totalBattles: number;
    readonly winRate: number;
    readonly lastBattleDate: string;
    readonly totalRatingDelta?: number;
    readonly avgRatingDelta?: number;
  }>;
  readonly pagination: {
    readonly size: number;
    readonly hasNext: boolean;
    readonly hasPrev: boolean;
    readonly nextCursor?: string;
    readonly previousCursor?: string;
    readonly total?: number;
  };
  readonly meta: {
    readonly performance: {
      readonly queryTime: number;
      readonly countTime?: number;
      readonly totalItems?: number;
      readonly estimatedTotal?: boolean;
    };
  };
};
export const HeadToHeadPaginatedResponseDto_Output = Schema.Struct({
  records: Schema.Array(
    Schema.Struct({
      opponentId: Schema.String,
      opponentName: Schema.String,
      opponentIcon: Schema.String,
      opponentProf: Schema.String,
      opponentLvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      lastBattleResult: Schema.Literals(["won", "lost", "flee"]),
      lastBattleUserWarrior: Schema.Struct({
        name: Schema.String,
        lvl: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        prof: Schema.String,
        icon: Schema.String,
        fireDamage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        frostDamage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        lightningDamage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        poisonDamageTaken: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        woundDamageTaken: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        critWoundDamageTaken: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      }),
      lastBattleOpponentWarrior: Schema.Struct({
        name: Schema.String,
        lvl: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        prof: Schema.String,
        icon: Schema.String,
        fireDamage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        frostDamage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        lightningDamage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        poisonDamageTaken: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        woundDamageTaken: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        critWoundDamageTaken: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      }),
      wins: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      losses: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      totalBattles: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      winRate: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      lastBattleDate: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      totalRatingDelta: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      avgRatingDelta: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
    }),
  ),
  pagination: Schema.Struct({
    size: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    hasNext: Schema.Boolean,
    hasPrev: Schema.Boolean,
    nextCursor: Schema.optionalKey(Schema.String),
    previousCursor: Schema.optionalKey(Schema.String),
    total: Schema.optionalKey(
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    ),
  }),
  meta: Schema.Struct({
    performance: Schema.Struct({
      queryTime: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      countTime: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      totalItems: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      estimatedTotal: Schema.optionalKey(Schema.Boolean),
    }),
  }),
}).annotate({ identifier: "HeadToHeadPaginatedResponseDto_Output" });
export type StreakResponseDto_Output = {
  readonly current: {
    readonly type: "wins" | "losses" | "none";
    readonly count: number;
  };
  readonly longest: { readonly wins: number; readonly losses: number };
};
export const StreakResponseDto_Output = Schema.Struct({
  current: Schema.Struct({
    type: Schema.Literals(["wins", "losses", "none"]),
    count: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  }),
  longest: Schema.Struct({
    wins: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    losses: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  }),
}).annotate({ identifier: "StreakResponseDto_Output" });
export type BattleDurationStatsResponseDto_Output = {
  readonly avgWinDuration: number;
  readonly avgLossDuration: number;
  readonly fastest:
    | ({ readonly duration: number; readonly battleId: string } & {
        readonly [x: string]: Schema.Json;
      })
    | null;
  readonly longest:
    | ({ readonly duration: number; readonly battleId: string } & {
        readonly [x: string]: Schema.Json;
      })
    | null;
};
export const BattleDurationStatsResponseDto_Output = Schema.Struct({
  avgWinDuration: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  avgLossDuration: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  fastest: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        duration: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        battleId: Schema.String,
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
  longest: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        duration: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        battleId: Schema.String,
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
}).annotate({ identifier: "BattleDurationStatsResponseDto_Output" });
export type PhGrowthDataPointResponseDto_Output = {
  readonly date: string;
  readonly ph: number;
  readonly cumulativePh: number;
  readonly battleId: string;
};
export const PhGrowthDataPointResponseDto_Output = Schema.Struct({
  date: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  ph: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  cumulativePh: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  battleId: Schema.String,
}).annotate({ identifier: "PhGrowthDataPointResponseDto_Output" });
export type RatingGrowthDataPointResponseDto_Output = {
  readonly date: string;
  readonly ratingDelta: number;
  readonly rating: number;
  readonly battleId: string;
};
export const RatingGrowthDataPointResponseDto_Output = Schema.Struct({
  date: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  ratingDelta: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  rating: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  battleId: Schema.String,
}).annotate({ identifier: "RatingGrowthDataPointResponseDto_Output" });
export type RatingDeltaByOpponentResponseDto_Output = {
  readonly opponentId: string;
  readonly opponentName: string;
  readonly opponentIcon: string;
  readonly opponentProf: string;
  readonly opponentLvl: number;
  readonly totalRatingDelta: number;
  readonly wins: number;
  readonly losses: number;
  readonly totalBattles: number;
  readonly avgRatingDelta: number;
  readonly lastBattleDate: string;
};
export const RatingDeltaByOpponentResponseDto_Output = Schema.Struct({
  opponentId: Schema.String,
  opponentName: Schema.String,
  opponentIcon: Schema.String,
  opponentProf: Schema.String,
  opponentLvl: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  totalRatingDelta: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  wins: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  losses: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  totalBattles: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  avgRatingDelta: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  lastBattleDate: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
}).annotate({ identifier: "RatingDeltaByOpponentResponseDto_Output" });
export type PlayerVsPlayerPaginatedResponseDto_Output = {
  readonly battles: ReadonlyArray<{
    readonly battleId: string;
    readonly createdAt: string;
    readonly duration: number;
    readonly winner: string;
    readonly loser: string;
    readonly hasFlee: boolean;
    readonly matchmaking: boolean;
    readonly ratingDelta: number | null;
    readonly userRating: number | null;
    readonly opponentRating: number | null;
    readonly userWarrior: {
      readonly name: string;
      readonly lvl: number;
      readonly prof: string;
      readonly icon: string;
      readonly fireDamage: number;
      readonly frostDamage: number;
      readonly lightningDamage: number;
      readonly poisonDamageTaken: number;
      readonly woundDamageTaken: number;
      readonly critWoundDamageTaken: number;
    };
    readonly opponentWarrior: {
      readonly name: string;
      readonly lvl: number;
      readonly prof: string;
      readonly icon: string;
      readonly fireDamage: number;
      readonly frostDamage: number;
      readonly lightningDamage: number;
      readonly poisonDamageTaken: number;
      readonly woundDamageTaken: number;
      readonly critWoundDamageTaken: number;
    };
  }>;
  readonly pagination: {
    readonly size: number;
    readonly hasNext: boolean;
    readonly hasPrev: boolean;
    readonly nextCursor?: string;
    readonly previousCursor?: string;
    readonly total?: number;
  };
  readonly meta: {
    readonly performance: {
      readonly queryTime: number;
      readonly totalItems?: number;
    };
  };
};
export const PlayerVsPlayerPaginatedResponseDto_Output = Schema.Struct({
  battles: Schema.Array(
    Schema.Struct({
      battleId: Schema.String,
      createdAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      duration: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      winner: Schema.String,
      loser: Schema.String,
      hasFlee: Schema.Boolean,
      matchmaking: Schema.Boolean,
      ratingDelta: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      userRating: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      opponentRating: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      userWarrior: Schema.Struct({
        name: Schema.String,
        lvl: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        prof: Schema.String,
        icon: Schema.String,
        fireDamage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        frostDamage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        lightningDamage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        poisonDamageTaken: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        woundDamageTaken: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        critWoundDamageTaken: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      }),
      opponentWarrior: Schema.Struct({
        name: Schema.String,
        lvl: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        prof: Schema.String,
        icon: Schema.String,
        fireDamage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        frostDamage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        lightningDamage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        poisonDamageTaken: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        woundDamageTaken: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        critWoundDamageTaken: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      }),
    }),
  ),
  pagination: Schema.Struct({
    size: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    hasNext: Schema.Boolean,
    hasPrev: Schema.Boolean,
    nextCursor: Schema.optionalKey(Schema.String),
    previousCursor: Schema.optionalKey(Schema.String),
    total: Schema.optionalKey(
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    ),
  }),
  meta: Schema.Struct({
    performance: Schema.Struct({
      queryTime: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      totalItems: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
    }),
  }),
}).annotate({ identifier: "PlayerVsPlayerPaginatedResponseDto_Output" });
export type BattleWarriorsSearchResponseDto_Output = {
  readonly warriors: ReadonlyArray<{
    readonly name: string;
    readonly icon: string;
    readonly prof: string;
    readonly lvl: number;
  }>;
};
export const BattleWarriorsSearchResponseDto_Output = Schema.Struct({
  warriors: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      icon: Schema.String,
      prof: Schema.String,
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
}).annotate({ identifier: "BattleWarriorsSearchResponseDto_Output" });
export type BattleUserWorldsResponseDto_Output = {
  readonly worlds: ReadonlyArray<string>;
};
export const BattleUserWorldsResponseDto_Output = Schema.Struct({
  worlds: Schema.Array(Schema.String),
}).annotate({ identifier: "BattleUserWorldsResponseDto_Output" });
export type BattleTimelineResponseDto_Output = {
  readonly battleId: string;
  readonly generatedAt: string;
  readonly timeline: ReadonlyArray<{
    readonly turn: number;
    readonly attackerId: string | null;
    readonly defenderId: string | null;
    readonly attackerHpPercentage: number | null;
    readonly defenderHpPercentage: number | null;
    readonly hpByWarrior: { readonly [x: string]: number };
    readonly teamHp: { readonly [x: string]: number };
    readonly teamHpDelta: { readonly [x: string]: number };
    readonly deltas: {
      readonly damage: number;
      readonly healing: number;
      readonly mitigation: number;
      readonly resourcePressure: number;
      readonly energyPressure: number;
      readonly manaPressure: number;
      readonly byWarrior: {
        readonly [x: string]: {
          readonly damageDealt: number;
          readonly damageTaken: number;
          readonly healingDone: number;
          readonly healingReceived: number;
          readonly mitigation: number;
          readonly resourceDelta: number;
          readonly resourcePressure: number;
          readonly energyPressure: number;
          readonly manaPressure: number;
          readonly absorbGained: number;
          readonly absorbSpent: number;
          readonly magicAbsorbGained: number;
          readonly magicAbsorbSpent: number;
          readonly controlApplied: number;
          readonly controlTaken: number;
        };
      };
    };
    readonly cumulative: {
      readonly [x: string]: {
        readonly damageDealt: number;
        readonly damageTaken: number;
        readonly healingDone: number;
        readonly healingReceived: number;
        readonly mitigation: number;
        readonly resourceDelta: number;
        readonly resourcePressure: number;
        readonly energyPressure: number;
        readonly manaPressure: number;
        readonly absorbGained: number;
        readonly absorbSpent: number;
        readonly magicAbsorbGained: number;
        readonly magicAbsorbSpent: number;
        readonly controlApplied: number;
        readonly controlTaken: number;
      };
    };
    readonly actions: ReadonlyArray<{
      readonly actionType: string;
      readonly param: string;
      readonly category: string;
      readonly actorId: string | null;
      readonly targetId: string | null;
      readonly value: number;
      readonly handled: boolean;
    }>;
    readonly flags: ReadonlyArray<string>;
    readonly labels: ReadonlyArray<string>;
    readonly significanceScore: number;
    readonly reason: string;
  }>;
  readonly warriors: ReadonlyArray<{
    readonly id: string;
    readonly battleId: string;
    readonly originalId: string;
    readonly name: string;
    readonly lvl: number;
    readonly prof: string;
    readonly icon: string;
    readonly team: number;
    readonly turns: number;
    readonly turnsLost: number;
    readonly steps: number;
    readonly normalAttacks: number;
    readonly spellsUsed: number;
    readonly spellsUsedMap: { readonly [x: string]: number };
    readonly isDead: boolean;
    readonly surrendered: boolean;
    readonly fled: boolean;
    readonly maxHp: number;
    readonly damageDealt: number;
    readonly distanceDamage: number;
    readonly meleeDamage: number;
    readonly auxiliaryDamage: number;
    readonly fireDamage: number;
    readonly frostDamage: number;
    readonly lightningDamage: number;
    readonly thirdAttDamage: number;
    readonly damageDealtAfterDefensive: number;
    readonly damageDealtAfterDefensivePercentage: number;
    readonly damageTaken: number;
    readonly distanceDamageTaken: number;
    readonly meleeDamageTaken: number;
    readonly auxiliaryDamageTaken: number;
    readonly fireDamageTaken: number;
    readonly frostDamageTaken: number;
    readonly lightningDamageTaken: number;
    readonly thirdAttDamageTaken: number;
    readonly flatDamageTaken: number;
    readonly rageDamageDealt: number;
    readonly trueDamageDealt: number;
    readonly trueDamageTaken: number;
    readonly stigmaDamageDealt: number;
    readonly stigmaDamageTaken: number;
    readonly passiveHealing: number;
    readonly activeHealing: number;
    readonly armorPierces: number;
    readonly criticalHits: number;
    readonly reducedArmor: number;
    readonly reducedPoisonResistance: number;
    readonly magicResistanceDestroyed: number;
    readonly evasions: number;
    readonly attacksEvaded: number;
    readonly counters: number;
    readonly fastArrows: number;
    readonly blocks: number;
    readonly attacksBlocked: number;
    readonly blockedDamage: number;
    readonly woundDamageTaken: number;
    readonly poisonDamageTaken: number;
    readonly injureDamageTaken: number;
    readonly injures: number;
    readonly critWoundDamageTaken: number;
    readonly firePassiveDamageTaken: number;
    readonly lightningPassiveDamageTaken: number;
    readonly destroyedEnergy: number;
    readonly destroyedMana: number;
    readonly regeneratedEnergy: number;
    readonly regeneratedMana: number;
    readonly reflectedDamage: number;
    readonly reflectedDamageTaken: number;
    readonly legbons: number;
    readonly legbonCurse: number;
    readonly legbonCleanse: number;
    readonly legbonLastheal: number;
    readonly legbonLasthealValue: number;
    readonly legbonGlare: number;
    readonly legbonHolytouch: number;
    readonly legbonHolytouchValue: number;
    readonly legbonCritredValue: number;
    readonly legbonFacadeValue: number;
    readonly legbonPunctureValue: number;
    readonly legbonVerycrit: number;
    readonly legbonAnguish: number;
    readonly legbonAnguishDamageTaken: number;
    readonly ph: number;
  }>;
};
export const BattleTimelineResponseDto_Output = Schema.Struct({
  battleId: Schema.String,
  generatedAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  timeline: Schema.Array(
    Schema.Struct({
      turn: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      attackerId: Schema.Union([Schema.String, Schema.Null]),
      defenderId: Schema.Union([Schema.String, Schema.Null]),
      attackerHpPercentage: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      defenderHpPercentage: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      hpByWarrior: Schema.Record(
        Schema.String,
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      teamHp: Schema.Record(
        Schema.String,
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      teamHpDelta: Schema.Record(
        Schema.String,
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      deltas: Schema.Struct({
        damage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        healing: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        mitigation: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        resourcePressure: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        energyPressure: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        manaPressure: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        byWarrior: Schema.Record(
          Schema.String,
          Schema.Struct({
            damageDealt: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            damageTaken: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            healingDone: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            healingReceived: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            mitigation: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            resourceDelta: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            resourcePressure: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            energyPressure: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            manaPressure: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            absorbGained: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            absorbSpent: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            magicAbsorbGained: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            magicAbsorbSpent: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            controlApplied: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            controlTaken: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
          }),
        ),
      }),
      cumulative: Schema.Record(
        Schema.String,
        Schema.Struct({
          damageDealt: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          damageTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          healingDone: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          healingReceived: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          mitigation: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          resourceDelta: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          resourcePressure: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          energyPressure: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          manaPressure: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          absorbGained: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          absorbSpent: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          magicAbsorbGained: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          magicAbsorbSpent: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          controlApplied: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          controlTaken: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        }),
      ),
      actions: Schema.Array(
        Schema.Struct({
          actionType: Schema.String,
          param: Schema.String,
          category: Schema.String,
          actorId: Schema.Union([Schema.String, Schema.Null]),
          targetId: Schema.Union([Schema.String, Schema.Null]),
          value: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          handled: Schema.Boolean,
        }),
      ),
      flags: Schema.Array(Schema.String),
      labels: Schema.Array(Schema.String),
      significanceScore: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      reason: Schema.String,
    }),
  ),
  warriors: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      battleId: Schema.String,
      originalId: Schema.String,
      name: Schema.String,
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      prof: Schema.String,
      icon: Schema.String,
      team: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      turns: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      turnsLost: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      steps: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      normalAttacks: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      spellsUsed: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      spellsUsedMap: Schema.Record(
        Schema.String,
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      isDead: Schema.Boolean,
      surrendered: Schema.Boolean,
      fled: Schema.Boolean,
      maxHp: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      damageDealt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      distanceDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      meleeDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      auxiliaryDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      fireDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      frostDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      lightningDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      thirdAttDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      damageDealtAfterDefensive: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      damageDealtAfterDefensivePercentage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      damageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      distanceDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      meleeDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      auxiliaryDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      fireDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      frostDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      lightningDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      thirdAttDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      flatDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      rageDamageDealt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      trueDamageDealt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      trueDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      stigmaDamageDealt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      stigmaDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      passiveHealing: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      activeHealing: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      armorPierces: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      criticalHits: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      reducedArmor: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      reducedPoisonResistance: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      magicResistanceDestroyed: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      evasions: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      attacksEvaded: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      counters: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      fastArrows: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      blocks: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      attacksBlocked: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      blockedDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      woundDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      poisonDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      injureDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      injures: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      critWoundDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      firePassiveDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      lightningPassiveDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      destroyedEnergy: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      destroyedMana: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      regeneratedEnergy: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      regeneratedMana: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      reflectedDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      reflectedDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbons: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonCurse: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonCleanse: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonLastheal: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonLasthealValue: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonGlare: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonHolytouch: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonHolytouchValue: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonCritredValue: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonFacadeValue: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonPunctureValue: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonVerycrit: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonAnguish: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonAnguishDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      ph: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
}).annotate({ identifier: "BattleTimelineResponseDto_Output" });
export type BattleResponseDto_Output = {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly public: boolean;
  readonly userId: string;
  readonly accountId: string;
  readonly characterId: string;
  readonly world: string;
  readonly duration: number;
  readonly type: string;
  readonly winner: string;
  readonly loser: string;
  readonly winningTeam: number;
  readonly losingTeam: number;
  readonly honorPoints: number;
  readonly hasFlee: boolean;
  readonly matchmaking: boolean;
  readonly statistics: {
    readonly topDamageDealer:
      | ({
          readonly warriorId: string;
          readonly name: string;
          readonly value: number;
          readonly formattedValue?: string;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly topTank:
      | ({
          readonly warriorId: string;
          readonly name: string;
          readonly value: number;
          readonly formattedValue?: string;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly bestEfficiency:
      | ({
          readonly warriorId: string;
          readonly name: string;
          readonly value: number;
          readonly formattedValue?: string;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly criticalMaster:
      | ({
          readonly warriorId: string;
          readonly name: string;
          readonly value: number;
          readonly formattedValue?: string;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly evasionExpert:
      | ({
          readonly warriorId: string;
          readonly name: string;
          readonly value: number;
          readonly formattedValue?: string;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly shieldWall:
      | ({
          readonly warriorId: string;
          readonly name: string;
          readonly value: number;
          readonly formattedValue?: string;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly damagePerTurn:
      | ({
          readonly warriorId: string;
          readonly name: string;
          readonly value: number;
          readonly formattedValue?: string;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly mostActive:
      | ({
          readonly warriorId: string;
          readonly name: string;
          readonly value: number;
          readonly formattedValue?: string;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly legendaryWarrior:
      | ({
          readonly warriorId: string;
          readonly name: string;
          readonly value: number;
          readonly formattedValue?: string;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly untouchable:
      | ({
          readonly warriorId: string;
          readonly name: string;
          readonly value: number;
          readonly formattedValue?: string;
        } & { readonly [x: string]: Schema.Json })
      | null;
  };
  readonly difficultyRank: number | null;
  readonly result: number | null;
  readonly ratingDelta: number | null;
  readonly opponentLvl: number | null;
  readonly opponentOplvl: number | null;
  readonly opponentRating: number | null;
  readonly rating: number | null;
  readonly status: number | null;
  readonly pointsGained: number | null;
  readonly placementCur: number | null;
  readonly placementMax: number | null;
  readonly dailyStageId: number | null;
  readonly dailyPointsCur: number | null;
  readonly dailyPointsMax: number | null;
  readonly dailyPointsStep: number | null;
  readonly dailyRewardsLast: number | null;
  readonly dailyRewardsCur: number | null;
  readonly dailyRewardsMax: number | null;
  readonly warriors: ReadonlyArray<{
    readonly id: string;
    readonly battleId: string;
    readonly originalId: string;
    readonly name: string;
    readonly lvl: number;
    readonly prof: string;
    readonly icon: string;
    readonly team: number;
    readonly turns: number;
    readonly turnsLost: number;
    readonly steps: number;
    readonly normalAttacks: number;
    readonly spellsUsed: number;
    readonly spellsUsedMap: { readonly [x: string]: number };
    readonly isDead: boolean;
    readonly surrendered: boolean;
    readonly fled: boolean;
    readonly maxHp: number;
    readonly damageDealt: number;
    readonly distanceDamage: number;
    readonly meleeDamage: number;
    readonly auxiliaryDamage: number;
    readonly fireDamage: number;
    readonly frostDamage: number;
    readonly lightningDamage: number;
    readonly thirdAttDamage: number;
    readonly damageDealtAfterDefensive: number;
    readonly damageDealtAfterDefensivePercentage: number;
    readonly damageTaken: number;
    readonly distanceDamageTaken: number;
    readonly meleeDamageTaken: number;
    readonly auxiliaryDamageTaken: number;
    readonly fireDamageTaken: number;
    readonly frostDamageTaken: number;
    readonly lightningDamageTaken: number;
    readonly thirdAttDamageTaken: number;
    readonly flatDamageTaken: number;
    readonly rageDamageDealt: number;
    readonly trueDamageDealt: number;
    readonly trueDamageTaken: number;
    readonly stigmaDamageDealt: number;
    readonly stigmaDamageTaken: number;
    readonly passiveHealing: number;
    readonly activeHealing: number;
    readonly armorPierces: number;
    readonly criticalHits: number;
    readonly reducedArmor: number;
    readonly reducedPoisonResistance: number;
    readonly magicResistanceDestroyed: number;
    readonly evasions: number;
    readonly attacksEvaded: number;
    readonly counters: number;
    readonly fastArrows: number;
    readonly blocks: number;
    readonly attacksBlocked: number;
    readonly blockedDamage: number;
    readonly woundDamageTaken: number;
    readonly poisonDamageTaken: number;
    readonly injureDamageTaken: number;
    readonly injures: number;
    readonly critWoundDamageTaken: number;
    readonly firePassiveDamageTaken: number;
    readonly lightningPassiveDamageTaken: number;
    readonly destroyedEnergy: number;
    readonly destroyedMana: number;
    readonly regeneratedEnergy: number;
    readonly regeneratedMana: number;
    readonly reflectedDamage: number;
    readonly reflectedDamageTaken: number;
    readonly legbons: number;
    readonly legbonCurse: number;
    readonly legbonCleanse: number;
    readonly legbonLastheal: number;
    readonly legbonLasthealValue: number;
    readonly legbonGlare: number;
    readonly legbonHolytouch: number;
    readonly legbonHolytouchValue: number;
    readonly legbonCritredValue: number;
    readonly legbonFacadeValue: number;
    readonly legbonPunctureValue: number;
    readonly legbonVerycrit: number;
    readonly legbonAnguish: number;
    readonly legbonAnguishDamageTaken: number;
    readonly ph: number;
  }>;
};
export const BattleResponseDto_Output = Schema.Struct({
  id: Schema.String,
  createdAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  updatedAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  public: Schema.Boolean,
  userId: Schema.String,
  accountId: Schema.String,
  characterId: Schema.String,
  world: Schema.String,
  duration: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  type: Schema.String,
  winner: Schema.String,
  loser: Schema.String,
  winningTeam: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  losingTeam: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  honorPoints: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  hasFlee: Schema.Boolean,
  matchmaking: Schema.Boolean,
  statistics: Schema.Struct({
    topDamageDealer: Schema.Union([
      Schema.StructWithRest(
        Schema.Struct({
          warriorId: Schema.String,
          name: Schema.String,
          value: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          value: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          value: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          value: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          value: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          value: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          value: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          value: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          value: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          value: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
  difficultyRank: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  result: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  ratingDelta: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  opponentLvl: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  opponentOplvl: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  opponentRating: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  rating: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  status: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  pointsGained: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  placementCur: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  placementMax: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  dailyStageId: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  dailyPointsCur: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  dailyPointsMax: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  dailyPointsStep: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  dailyRewardsLast: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  dailyRewardsCur: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  dailyRewardsMax: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  warriors: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      battleId: Schema.String,
      originalId: Schema.String,
      name: Schema.String,
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      prof: Schema.String,
      icon: Schema.String,
      team: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      turns: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      turnsLost: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      steps: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      normalAttacks: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      spellsUsed: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      spellsUsedMap: Schema.Record(
        Schema.String,
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      isDead: Schema.Boolean,
      surrendered: Schema.Boolean,
      fled: Schema.Boolean,
      maxHp: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      damageDealt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      distanceDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      meleeDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      auxiliaryDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      fireDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      frostDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      lightningDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      thirdAttDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      damageDealtAfterDefensive: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      damageDealtAfterDefensivePercentage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      damageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      distanceDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      meleeDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      auxiliaryDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      fireDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      frostDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      lightningDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      thirdAttDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      flatDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      rageDamageDealt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      trueDamageDealt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      trueDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      stigmaDamageDealt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      stigmaDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      passiveHealing: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      activeHealing: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      armorPierces: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      criticalHits: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      reducedArmor: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      reducedPoisonResistance: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      magicResistanceDestroyed: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      evasions: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      attacksEvaded: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      counters: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      fastArrows: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      blocks: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      attacksBlocked: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      blockedDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      woundDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      poisonDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      injureDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      injures: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      critWoundDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      firePassiveDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      lightningPassiveDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      destroyedEnergy: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      destroyedMana: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      regeneratedEnergy: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      regeneratedMana: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      reflectedDamage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      reflectedDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbons: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonCurse: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonCleanse: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonLastheal: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonLasthealValue: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonGlare: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonHolytouch: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonHolytouchValue: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonCritredValue: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonFacadeValue: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonPunctureValue: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonVerycrit: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonAnguish: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legbonAnguishDamageTaken: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      ph: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
}).annotate({ identifier: "BattleResponseDto_Output" });
export type BattleDeletedResponseDto_Output = { readonly message: string };
export const BattleDeletedResponseDto_Output = Schema.Struct({
  message: Schema.String,
}).annotate({ identifier: "BattleDeletedResponseDto_Output" });
export type UpdateBattleDto = { readonly public: boolean };
export const UpdateBattleDto = Schema.Struct({
  public: Schema.Boolean,
}).annotate({ identifier: "UpdateBattleDto" });
export type BattleRawResponseDto_Output = {
  readonly battleId: string;
  readonly timestamp: string;
  readonly rawData: {
    readonly accountId: string;
    readonly characterId: string;
    readonly world: string;
    readonly events: ReadonlyArray<{
      readonly attackerId: string | null;
      readonly defenderId: string | null;
      readonly attackerHpPercentage: number | null;
      readonly defenderHpPercentage: number | null;
      readonly actions: ReadonlyArray<{
        readonly actionType: string;
        readonly param: string;
      }>;
    }>;
    readonly sourceEvents?: ReadonlyArray<Schema.Json>;
  };
};
export const BattleRawResponseDto_Output = Schema.Struct({
  battleId: Schema.String,
  timestamp: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  rawData: Schema.Struct({
    accountId: Schema.String,
    characterId: Schema.String,
    world: Schema.String,
    events: Schema.Array(
      Schema.Struct({
        attackerId: Schema.Union([Schema.String, Schema.Null]),
        defenderId: Schema.Union([Schema.String, Schema.Null]),
        attackerHpPercentage: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
        defenderHpPercentage: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
        actions: Schema.Array(
          Schema.Struct({ actionType: Schema.String, param: Schema.String }),
        ),
      }),
    ),
    sourceEvents: Schema.optionalKey(
      Schema.Array(Schema.Json.annotate({ expected: "JSON value" })),
    ),
  }),
}).annotate({ identifier: "BattleRawResponseDto_Output" });
export type DeleteUserDataDto = { readonly userId: string };
export const DeleteUserDataDto = Schema.Struct({
  userId: Schema.String,
}).annotate({ identifier: "DeleteUserDataDto" });
export type BattleAcceptedResponseDto_Output = { readonly status: "ACCEPTED" };
export const BattleAcceptedResponseDto_Output = Schema.Struct({
  status: Schema.Literal("ACCEPTED"),
}).annotate({ identifier: "BattleAcceptedResponseDto_Output" });
// schemas
export type BattlesControllerCreateBattleRequestJson = CreateBattleDto;
export const BattlesControllerCreateBattleRequestJson = CreateBattleDto;
export type BattlesControllerCreateBattle201 = BattleCreatedResponseDto_Output;
export const BattlesControllerCreateBattle201 = BattleCreatedResponseDto_Output;
export type BattlesControllerGetDashboardBattlesParams = {
  readonly cursor?: string;
  readonly size?: number;
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly world?: string;
  readonly type?: ReadonlyArray<"solo" | "group">;
  readonly userId?: string;
  readonly public?: boolean;
  readonly characterId?: ReadonlyArray<string>;
  readonly search?: string;
  readonly result?: ReadonlyArray<"won" | "lost" | "flee">;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly minLevel?: number;
  readonly maxLevel?: number;
};
export const BattlesControllerGetDashboardBattlesParams = Schema.Struct({
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.annotate({ default: 20 })
      .check(Schema.isFinite().annotate({ expected: "a finite number" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(100).annotate({
          expected: "a value less than or equal to 100",
        }),
      ),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  world: Schema.optionalKey(Schema.String),
  type: Schema.optionalKey(Schema.Array(Schema.Literals(["solo", "group"]))),
  userId: Schema.optionalKey(Schema.String),
  public: Schema.optionalKey(Schema.Boolean),
  characterId: Schema.optionalKey(Schema.Array(Schema.String)),
  search: Schema.optionalKey(Schema.String),
  result: Schema.optionalKey(
    Schema.Array(Schema.Literals(["won", "lost", "flee"])),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(1000).annotate({
          expected: "a value less than or equal to 1000",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(1000).annotate({
          expected: "a value less than or equal to 1000",
        }),
      ),
  ),
});
export type BattlesControllerGetDashboardBattlesQuery = {
  readonly cursor?: string;
  readonly size?: number;
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly world?: string;
  readonly type?: ReadonlyArray<"solo" | "group">;
  readonly userId?: string;
  readonly public?: boolean;
  readonly characterId?: ReadonlyArray<string>;
  readonly search?: string;
  readonly result?: ReadonlyArray<"won" | "lost" | "flee">;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly minLevel?: number;
  readonly maxLevel?: number;
};
export const BattlesControllerGetDashboardBattlesQuery = Schema.Struct({
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.annotate({ default: 20 })
      .check(Schema.isFinite().annotate({ expected: "a finite number" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(100).annotate({
          expected: "a value less than or equal to 100",
        }),
      ),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  world: Schema.optionalKey(Schema.String),
  type: Schema.optionalKey(Schema.Array(Schema.Literals(["solo", "group"]))),
  userId: Schema.optionalKey(Schema.String),
  public: Schema.optionalKey(Schema.Boolean),
  characterId: Schema.optionalKey(Schema.Array(Schema.String)),
  search: Schema.optionalKey(Schema.String),
  result: Schema.optionalKey(
    Schema.Array(Schema.Literals(["won", "lost", "flee"])),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(1000).annotate({
          expected: "a value less than or equal to 1000",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(1000).annotate({
          expected: "a value less than or equal to 1000",
        }),
      ),
  ),
});
export type BattlesControllerGetDashboardBattles200 =
  BattlesListResponseDto_Output;
export const BattlesControllerGetDashboardBattles200 =
  BattlesListResponseDto_Output;
export type BattlesControllerGetUserCharacters200 =
  BattleCharactersResponseDto_Output;
export const BattlesControllerGetUserCharacters200 =
  BattleCharactersResponseDto_Output;
export type BattlesControllerGetBattleAnalyticsParams = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?: "24h" | "3d" | "7d" | "14d" | "30d" | "90d" | "180d";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetBattleAnalyticsParams = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetBattleAnalyticsQuery = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?: "24h" | "3d" | "7d" | "14d" | "30d" | "90d" | "180d";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetBattleAnalyticsQuery = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetBattleAnalytics200 =
  BattleAnalyticsResponseDto_Output;
export const BattlesControllerGetBattleAnalytics200 =
  BattleAnalyticsResponseDto_Output;
export type BattlesControllerGetAbyssSeasonsParams = {
  readonly characterId: string;
  readonly world?: string;
};
export const BattlesControllerGetAbyssSeasonsParams = Schema.Struct({
  characterId: Schema.String,
  world: Schema.optionalKey(Schema.String),
});
export type BattlesControllerGetAbyssSeasonsQuery = {
  readonly characterId: string;
  readonly world?: string;
};
export const BattlesControllerGetAbyssSeasonsQuery = Schema.Struct({
  characterId: Schema.String,
  world: Schema.optionalKey(Schema.String),
});
export type BattlesControllerGetAbyssSeasons200 =
  ReadonlyArray<AbyssSeasonResponseDto_Output>;
export const BattlesControllerGetAbyssSeasons200 = Schema.Array(
  AbyssSeasonResponseDto_Output,
);
export type BattlesControllerGetCombatProfileParams = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetCombatProfileParams = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetCombatProfileQuery = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetCombatProfileQuery = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetCombatProfile200 =
  CombatProfileResponseDto_Output;
export const BattlesControllerGetCombatProfile200 =
  CombatProfileResponseDto_Output;
export type BattlesControllerGetProfessionWinRateParams = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetProfessionWinRateParams = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetProfessionWinRateQuery = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetProfessionWinRateQuery = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetProfessionWinRate200 =
  ReadonlyArray<ProfessionWinRateResponseDto_Output>;
export const BattlesControllerGetProfessionWinRate200 = Schema.Array(
  ProfessionWinRateResponseDto_Output,
);
export type BattlesControllerGetHeadToHeadParams = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetHeadToHeadParams = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetHeadToHeadQuery = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetHeadToHeadQuery = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetHeadToHead200 =
  HeadToHeadPaginatedResponseDto_Output;
export const BattlesControllerGetHeadToHead200 =
  HeadToHeadPaginatedResponseDto_Output;
export type BattlesControllerGetCurrentStreakParams = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetCurrentStreakParams = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetCurrentStreakQuery = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetCurrentStreakQuery = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetCurrentStreak200 = StreakResponseDto_Output;
export const BattlesControllerGetCurrentStreak200 = StreakResponseDto_Output;
export type BattlesControllerGetBattleDurationParams = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetBattleDurationParams = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetBattleDurationQuery = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetBattleDurationQuery = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetBattleDuration200 =
  BattleDurationStatsResponseDto_Output;
export const BattlesControllerGetBattleDuration200 =
  BattleDurationStatsResponseDto_Output;
export type BattlesControllerGetPhGrowthParams = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetPhGrowthParams = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetPhGrowthQuery = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetPhGrowthQuery = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetPhGrowth200 =
  ReadonlyArray<PhGrowthDataPointResponseDto_Output>;
export const BattlesControllerGetPhGrowth200 = Schema.Array(
  PhGrowthDataPointResponseDto_Output,
);
export type BattlesControllerGetRatingGrowthParams = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetRatingGrowthParams = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetRatingGrowthQuery = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetRatingGrowthQuery = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetRatingGrowth200 =
  ReadonlyArray<RatingGrowthDataPointResponseDto_Output>;
export const BattlesControllerGetRatingGrowth200 = Schema.Array(
  RatingGrowthDataPointResponseDto_Output,
);
export type BattlesControllerGetRatingDeltaByOpponentParams = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetRatingDeltaByOpponentParams = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetRatingDeltaByOpponentQuery = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
};
export const BattlesControllerGetRatingDeltaByOpponentQuery = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});
export type BattlesControllerGetRatingDeltaByOpponent200 =
  ReadonlyArray<RatingDeltaByOpponentResponseDto_Output>;
export const BattlesControllerGetRatingDeltaByOpponent200 = Schema.Array(
  RatingDeltaByOpponentResponseDto_Output,
);
export type BattlesControllerGetPlayerVsPlayerBattlesParams = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
  readonly opponentId: string;
  readonly excludeBattleId?: string;
};
export const BattlesControllerGetPlayerVsPlayerBattlesParams = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
  opponentId: Schema.String,
  excludeBattleId: Schema.optionalKey(Schema.String),
});
export type BattlesControllerGetPlayerVsPlayerBattlesQuery = {
  readonly characterId?: string;
  readonly world?: string;
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly size?: number;
  readonly sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  readonly sortOrder?: "asc" | "desc";
  readonly includeTotal?: boolean;
  readonly search?: string;
  readonly minBattles?: number;
  readonly ph?: boolean;
  readonly matchmaking?: boolean;
  readonly opponentId: string;
  readonly excludeBattleId?: string;
};
export const BattlesControllerGetPlayerVsPlayerBattlesQuery = Schema.Struct({
  characterId: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  maxLevel: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  ),
  cursor: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  sortBy: Schema.optionalKey(
    Schema.Literals([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ]).annotate({ default: "totalBattles" }),
  ),
  sortOrder: Schema.optionalKey(
    Schema.Literals(["asc", "desc"]).annotate({ default: "desc" }),
  ),
  includeTotal: Schema.optionalKey(Schema.Boolean),
  search: Schema.optionalKey(Schema.String),
  minBattles: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
  opponentId: Schema.String,
  excludeBattleId: Schema.optionalKey(Schema.String),
});
export type BattlesControllerGetPlayerVsPlayerBattles200 =
  PlayerVsPlayerPaginatedResponseDto_Output;
export const BattlesControllerGetPlayerVsPlayerBattles200 =
  PlayerVsPlayerPaginatedResponseDto_Output;
export type BattlesControllerSearchWarriorsParams = { readonly q: string };
export const BattlesControllerSearchWarriorsParams = Schema.Struct({
  q: Schema.String,
});
export type BattlesControllerSearchWarriorsQuery = { readonly q: string };
export const BattlesControllerSearchWarriorsQuery = Schema.Struct({
  q: Schema.String,
});
export type BattlesControllerSearchWarriors200 =
  BattleWarriorsSearchResponseDto_Output;
export const BattlesControllerSearchWarriors200 =
  BattleWarriorsSearchResponseDto_Output;
export type BattlesControllerGetUserWorlds200 =
  BattleUserWorldsResponseDto_Output;
export const BattlesControllerGetUserWorlds200 =
  BattleUserWorldsResponseDto_Output;
export type BattlesControllerGetBattleTimelinePathParams = {
  readonly battleId: string;
};
export const BattlesControllerGetBattleTimelinePathParams = Schema.Struct({
  battleId: Schema.String,
});
export type BattlesControllerGetBattleTimeline200 =
  BattleTimelineResponseDto_Output;
export const BattlesControllerGetBattleTimeline200 =
  BattleTimelineResponseDto_Output;
export type BattlesControllerGetBattlePathParams = {
  readonly battleId: string;
};
export const BattlesControllerGetBattlePathParams = Schema.Struct({
  battleId: Schema.String,
});
export type BattlesControllerGetBattle200 = BattleResponseDto_Output;
export const BattlesControllerGetBattle200 = BattleResponseDto_Output;
export type BattlesControllerDeleteBattlePathParams = {
  readonly battleId: string;
};
export const BattlesControllerDeleteBattlePathParams = Schema.Struct({
  battleId: Schema.String,
});
export type BattlesControllerDeleteBattle200 = BattleDeletedResponseDto_Output;
export const BattlesControllerDeleteBattle200 = BattleDeletedResponseDto_Output;
export type BattlesControllerUpdateBattlePathParams = {
  readonly battleId: string;
};
export const BattlesControllerUpdateBattlePathParams = Schema.Struct({
  battleId: Schema.String,
});
export type BattlesControllerUpdateBattleRequestJson = UpdateBattleDto;
export const BattlesControllerUpdateBattleRequestJson = UpdateBattleDto;
export type BattlesControllerUpdateBattle200 = BattleResponseDto_Output;
export const BattlesControllerUpdateBattle200 = BattleResponseDto_Output;
export type BattlesControllerGetBattleRawDataPathParams = {
  readonly battleId: string;
};
export const BattlesControllerGetBattleRawDataPathParams = Schema.Struct({
  battleId: Schema.String,
});
export type BattlesControllerGetBattleRawData200 = BattleRawResponseDto_Output;
export const BattlesControllerGetBattleRawData200 = BattleRawResponseDto_Output;
export type PublicBattlesControllerGetPublicBattlePathParams = {
  readonly battleId: string;
};
export const PublicBattlesControllerGetPublicBattlePathParams = Schema.Struct({
  battleId: Schema.String,
});
export type PublicBattlesControllerGetPublicBattle200 =
  BattleResponseDto_Output;
export const PublicBattlesControllerGetPublicBattle200 =
  BattleResponseDto_Output;
export type PublicBattlesControllerGetPublicBattleRawPathParams = {
  readonly battleId: string;
};
export const PublicBattlesControllerGetPublicBattleRawPathParams =
  Schema.Struct({ battleId: Schema.String });
export type PublicBattlesControllerGetPublicBattleRaw200 =
  BattleRawResponseDto_Output;
export const PublicBattlesControllerGetPublicBattleRaw200 =
  BattleRawResponseDto_Output;
export type PublicBattlesControllerGetPublicBattleTimelinePathParams = {
  readonly battleId: string;
};
export const PublicBattlesControllerGetPublicBattleTimelinePathParams =
  Schema.Struct({ battleId: Schema.String });
export type PublicBattlesControllerGetPublicBattleTimeline200 =
  BattleTimelineResponseDto_Output;
export const PublicBattlesControllerGetPublicBattleTimeline200 =
  BattleTimelineResponseDto_Output;
export type InternalControllerDeleteUserDataRequestJson = DeleteUserDataDto;
export const InternalControllerDeleteUserDataRequestJson = DeleteUserDataDto;
export type InternalControllerDeleteUserData201 =
  BattleAcceptedResponseDto_Output;
export const InternalControllerDeleteUserData201 =
  BattleAcceptedResponseDto_Output;

export const BearerSecurity = HttpApiSecurity.bearer.pipe(
  HttpApiSecurity.annotate(OpenApi.Format, "JWT"),
);

export class BearerSecurityMiddleware extends HttpApiMiddleware.Service<BearerSecurityMiddleware>()(
  "bearer security",
  { security: { bearer: BearerSecurity } },
) {}

class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("HealthzControllerHealthCheck", "/healthz", {
    success: HttpApiSchema.Empty(200),
  })
    .annotate(OpenApi.Identifier, "HealthzController_healthCheck")
    .annotate(OpenApi.Summary, "Health check")
    .annotate(OpenApi.Description, "Check the health status of the API"),
) {}

class BattlesGroup extends HttpApiGroup.make("battles").add(
  HttpApiEndpoint.post("BattlesControllerCreateBattle", "/battles", {
    payload: BattlesControllerCreateBattleRequestJson,
    success: BattlesControllerCreateBattle201.pipe(HttpApiSchema.status(201)),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_createBattle")
    .annotate(OpenApi.Summary, "Create a battle"),
  HttpApiEndpoint.get("BattlesControllerGetDashboardBattles", "/battles/@me", {
    query: BattlesControllerGetDashboardBattlesQuery,
    success: BattlesControllerGetDashboardBattles200,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getDashboardBattles")
    .annotate(OpenApi.Summary, "Get authenticated user battles"),
  HttpApiEndpoint.get(
    "BattlesControllerGetUserCharacters",
    "/battles/@me/characters",
    { success: BattlesControllerGetUserCharacters200 },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getUserCharacters")
    .annotate(OpenApi.Summary, "Get authenticated user battle characters"),
  HttpApiEndpoint.get(
    "BattlesControllerGetBattleAnalytics",
    "/battles/@me/analytics",
    {
      query: BattlesControllerGetBattleAnalyticsQuery,
      success: BattlesControllerGetBattleAnalytics200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getBattleAnalytics")
    .annotate(OpenApi.Summary, "Get authenticated user battle analytics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetAbyssSeasons",
    "/battles/@me/abyss/seasons",
    {
      query: BattlesControllerGetAbyssSeasonsQuery,
      success: BattlesControllerGetAbyssSeasons200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getAbyssSeasons")
    .annotate(OpenApi.Summary, "Get authenticated user Abyss seasons"),
  HttpApiEndpoint.get(
    "BattlesControllerGetCombatProfile",
    "/battles/@me/statistics/combat-profile",
    {
      query: BattlesControllerGetCombatProfileQuery,
      success: BattlesControllerGetCombatProfile200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getCombatProfile")
    .annotate(OpenApi.Summary, "Get combat profile statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetProfessionWinRate",
    "/battles/@me/statistics/profession-win-rate",
    {
      query: BattlesControllerGetProfessionWinRateQuery,
      success: BattlesControllerGetProfessionWinRate200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getProfessionWinRate")
    .annotate(OpenApi.Summary, "Get profession win rate statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetHeadToHead",
    "/battles/@me/statistics/head-to-head",
    {
      query: BattlesControllerGetHeadToHeadQuery,
      success: BattlesControllerGetHeadToHead200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getHeadToHead")
    .annotate(OpenApi.Summary, "Get head-to-head statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetCurrentStreak",
    "/battles/@me/statistics/streak",
    {
      query: BattlesControllerGetCurrentStreakQuery,
      success: BattlesControllerGetCurrentStreak200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getCurrentStreak")
    .annotate(OpenApi.Summary, "Get current battle streak statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetBattleDuration",
    "/battles/@me/statistics/duration",
    {
      query: BattlesControllerGetBattleDurationQuery,
      success: BattlesControllerGetBattleDuration200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getBattleDuration")
    .annotate(OpenApi.Summary, "Get battle duration statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetPhGrowth",
    "/battles/@me/statistics/ph-growth",
    {
      query: BattlesControllerGetPhGrowthQuery,
      success: BattlesControllerGetPhGrowth200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getPhGrowth")
    .annotate(OpenApi.Summary, "Get PH growth statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetRatingGrowth",
    "/battles/@me/statistics/rating-growth",
    {
      query: BattlesControllerGetRatingGrowthQuery,
      success: BattlesControllerGetRatingGrowth200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getRatingGrowth")
    .annotate(OpenApi.Summary, "Get rating growth statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetRatingDeltaByOpponent",
    "/battles/@me/statistics/rating-delta-by-opponent",
    {
      query: BattlesControllerGetRatingDeltaByOpponentQuery,
      success: BattlesControllerGetRatingDeltaByOpponent200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getRatingDeltaByOpponent")
    .annotate(OpenApi.Summary, "Get rating delta by opponent statistics"),
  HttpApiEndpoint.get(
    "BattlesControllerGetPlayerVsPlayerBattles",
    "/battles/@me/statistics/player-vs-player",
    {
      query: BattlesControllerGetPlayerVsPlayerBattlesQuery,
      success: BattlesControllerGetPlayerVsPlayerBattles200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getPlayerVsPlayerBattles")
    .annotate(OpenApi.Summary, "Get player-vs-player battles"),
  HttpApiEndpoint.get(
    "BattlesControllerSearchWarriors",
    "/battles/@me/warriors/search",
    {
      query: BattlesControllerSearchWarriorsQuery,
      success: BattlesControllerSearchWarriors200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_searchWarriors")
    .annotate(OpenApi.Summary, "Search warriors for authenticated user"),
  HttpApiEndpoint.get("BattlesControllerGetUserWorlds", "/battles/@me/worlds", {
    success: BattlesControllerGetUserWorlds200,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getUserWorlds")
    .annotate(OpenApi.Summary, "Get worlds used by authenticated user battles"),
  HttpApiEndpoint.get(
    "BattlesControllerGetBattleTimeline",
    "/battles/:battleId/timeline",
    {
      params: BattlesControllerGetBattleTimelinePathParams,
      success: BattlesControllerGetBattleTimeline200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getBattleTimeline")
    .annotate(OpenApi.Summary, "Get computed battle timeline"),
  HttpApiEndpoint.get("BattlesControllerGetBattle", "/battles/:battleId", {
    params: BattlesControllerGetBattlePathParams,
    success: BattlesControllerGetBattle200,
    error: HttpApiSchema.Empty(404),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getBattle")
    .annotate(OpenApi.Summary, "Get a single battle"),
  HttpApiEndpoint.delete(
    "BattlesControllerDeleteBattle",
    "/battles/:battleId",
    {
      params: BattlesControllerDeleteBattlePathParams,
      success: BattlesControllerDeleteBattle200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_deleteBattle")
    .annotate(OpenApi.Summary, "Delete a battle"),
  HttpApiEndpoint.patch("BattlesControllerUpdateBattle", "/battles/:battleId", {
    params: BattlesControllerUpdateBattlePathParams,
    payload: BattlesControllerUpdateBattleRequestJson,
    success: BattlesControllerUpdateBattle200,
    error: HttpApiSchema.Empty(404),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_updateBattle")
    .annotate(OpenApi.Summary, "Update battle visibility"),
  HttpApiEndpoint.get(
    "BattlesControllerGetBattleRawData",
    "/battles/:battleId/raw",
    {
      params: BattlesControllerGetBattleRawDataPathParams,
      success: BattlesControllerGetBattleRawData200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "BattlesController_getBattleRawData")
    .annotate(OpenApi.Summary, "Get raw battle payload"),
) {}

class PublicBattlesGroup extends HttpApiGroup.make("public-battles").add(
  HttpApiEndpoint.get(
    "PublicBattlesControllerGetPublicBattle",
    "/battles/public/:battleId",
    {
      params: PublicBattlesControllerGetPublicBattlePathParams,
      success: PublicBattlesControllerGetPublicBattle200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .annotate(OpenApi.Identifier, "PublicBattlesController_getPublicBattle")
    .annotate(OpenApi.Summary, "Get a public battle"),
  HttpApiEndpoint.get(
    "PublicBattlesControllerGetPublicBattleRaw",
    "/battles/public/:battleId/raw",
    {
      params: PublicBattlesControllerGetPublicBattleRawPathParams,
      success: PublicBattlesControllerGetPublicBattleRaw200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .annotate(OpenApi.Identifier, "PublicBattlesController_getPublicBattleRaw")
    .annotate(OpenApi.Summary, "Get raw payload for a public battle"),
  HttpApiEndpoint.get(
    "PublicBattlesControllerGetPublicBattleTimeline",
    "/battles/public/:battleId/timeline",
    {
      params: PublicBattlesControllerGetPublicBattleTimelinePathParams,
      success: PublicBattlesControllerGetPublicBattleTimeline200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .annotate(
      OpenApi.Identifier,
      "PublicBattlesController_getPublicBattleTimeline",
    )
    .annotate(OpenApi.Summary, "Get computed timeline for a public battle"),
) {}

class InternalGroup extends HttpApiGroup.make("internal").add(
  HttpApiEndpoint.post(
    "InternalControllerDeleteUserData",
    "/internal/delete-user-data",
    {
      payload: InternalControllerDeleteUserDataRequestJson,
      success: InternalControllerDeleteUserData201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .annotate(OpenApi.Identifier, "InternalController_deleteUserData")
    .annotate(OpenApi.Summary, "Queue battle data deletion for a user"),
) {}

export class BattlelogApi extends HttpApi.make("BattlelogApi")
  .annotate(OpenApi.Title, "Battle Log API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(OpenApi.Description, "The Battle Log API documentation")
  .annotate(OpenApi.Servers, [])
  .add(HealthGroup, BattlesGroup, PublicBattlesGroup, InternalGroup) {}
