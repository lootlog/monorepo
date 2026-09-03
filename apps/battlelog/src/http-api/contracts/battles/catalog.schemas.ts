/** catalog transport definitions for battles. */
import * as Schema from "effect/Schema";

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
