/** analytics transport definitions for battles. */
import * as Schema from "effect/Schema";

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
