/** endpoints transport definitions for battles. */
import * as Schema from "effect/Schema";
import {
  BattleRawResponseDto_Output,
  BattleResponseDto_Output,
  BattleTimelineResponseDto_Output,
} from "../shared.js";
import {
  BattleCreatedResponseDto_Output,
  CreateBattleDto,
} from "./creation.schemas.js";
import {
  BattleCharactersResponseDto_Output,
  BattlesListResponseDto_Output,
} from "./catalog.schemas.js";
import {
  AbyssSeasonResponseDto_Output,
  BattleAnalyticsResponseDto_Output,
  BattleDurationStatsResponseDto_Output,
  BattleUserWorldsResponseDto_Output,
  BattleWarriorsSearchResponseDto_Output,
  CombatProfileResponseDto_Output,
  HeadToHeadPaginatedResponseDto_Output,
  PhGrowthDataPointResponseDto_Output,
  PlayerVsPlayerPaginatedResponseDto_Output,
  ProfessionWinRateResponseDto_Output,
  RatingDeltaByOpponentResponseDto_Output,
  RatingGrowthDataPointResponseDto_Output,
  StreakResponseDto_Output,
} from "./analytics.schemas.js";
import {
  BattleDeletedResponseDto_Output,
  UpdateBattleDto,
} from "./mutations.schemas.js";
import { DateTimeString, FiniteNumber } from "../scalars.js";

// schemas
export type BattlesControllerCreateBattleRequestJson =
  typeof BattlesControllerCreateBattleRequestJson.Type;

export const BattlesControllerCreateBattleRequestJson = CreateBattleDto;

export type BattlesControllerCreateBattle201 =
  typeof BattlesControllerCreateBattle201.Type;

export const BattlesControllerCreateBattle201 = BattleCreatedResponseDto_Output;

export type BattlesControllerGetDashboardBattlesQuery =
  typeof BattlesControllerGetDashboardBattlesQuery.Type;

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
  startDate: Schema.optionalKey(DateTimeString),
  endDate: Schema.optionalKey(DateTimeString),
  minLevel: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(1).annotate({
        expected: "a value greater than or equal to 1",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(1000).annotate({
        expected: "a value less than or equal to 1000",
      }),
    ),
  ),
  maxLevel: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(1).annotate({
        expected: "a value greater than or equal to 1",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(1000).annotate({
        expected: "a value less than or equal to 1000",
      }),
    ),
  ),
});

export type BattlesControllerGetDashboardBattles200 =
  typeof BattlesControllerGetDashboardBattles200.Type;

export const BattlesControllerGetDashboardBattles200 =
  BattlesListResponseDto_Output;

export type BattlesControllerGetUserCharacters200 =
  typeof BattlesControllerGetUserCharacters200.Type;

export const BattlesControllerGetUserCharacters200 =
  BattleCharactersResponseDto_Output;

export type BattlesControllerGetBattleAnalyticsQuery =
  typeof BattlesControllerGetBattleAnalyticsQuery.Type;

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
  startDate: Schema.optionalKey(DateTimeString),
  endDate: Schema.optionalKey(DateTimeString),
  ph: Schema.optionalKey(Schema.Boolean),
  matchmaking: Schema.optionalKey(Schema.Boolean),
});

export type BattlesControllerGetBattleAnalytics200 =
  typeof BattlesControllerGetBattleAnalytics200.Type;

export const BattlesControllerGetBattleAnalytics200 =
  BattleAnalyticsResponseDto_Output;

export type BattlesControllerGetAbyssSeasonsQuery =
  typeof BattlesControllerGetAbyssSeasonsQuery.Type;

export const BattlesControllerGetAbyssSeasonsQuery = Schema.Struct({
  characterId: Schema.String,
  world: Schema.optionalKey(Schema.String),
});

export type BattlesControllerGetAbyssSeasons200 =
  typeof BattlesControllerGetAbyssSeasons200.Type;

export const BattlesControllerGetAbyssSeasons200 = Schema.Array(
  AbyssSeasonResponseDto_Output,
);

export type BattlesControllerGetCombatProfileQuery =
  typeof BattlesControllerGetCombatProfileQuery.Type;

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
  startDate: Schema.optionalKey(DateTimeString),
  endDate: Schema.optionalKey(DateTimeString),
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
  typeof BattlesControllerGetCombatProfile200.Type;

export const BattlesControllerGetCombatProfile200 =
  CombatProfileResponseDto_Output;

export type BattlesControllerGetProfessionWinRateQuery =
  typeof BattlesControllerGetProfessionWinRateQuery.Type;

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
  startDate: Schema.optionalKey(DateTimeString),
  endDate: Schema.optionalKey(DateTimeString),
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
  typeof BattlesControllerGetProfessionWinRate200.Type;

export const BattlesControllerGetProfessionWinRate200 = Schema.Array(
  ProfessionWinRateResponseDto_Output,
);

export type BattlesControllerGetHeadToHeadQuery =
  typeof BattlesControllerGetHeadToHeadQuery.Type;

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
  startDate: Schema.optionalKey(DateTimeString),
  endDate: Schema.optionalKey(DateTimeString),
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
  typeof BattlesControllerGetHeadToHead200.Type;

export const BattlesControllerGetHeadToHead200 =
  HeadToHeadPaginatedResponseDto_Output;

export type BattlesControllerGetCurrentStreakQuery =
  typeof BattlesControllerGetCurrentStreakQuery.Type;

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
  startDate: Schema.optionalKey(DateTimeString),
  endDate: Schema.optionalKey(DateTimeString),
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

export type BattlesControllerGetCurrentStreak200 =
  typeof BattlesControllerGetCurrentStreak200.Type;

export const BattlesControllerGetCurrentStreak200 = StreakResponseDto_Output;

export type BattlesControllerGetBattleDurationQuery =
  typeof BattlesControllerGetBattleDurationQuery.Type;

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
  startDate: Schema.optionalKey(DateTimeString),
  endDate: Schema.optionalKey(DateTimeString),
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
  typeof BattlesControllerGetBattleDuration200.Type;

export const BattlesControllerGetBattleDuration200 =
  BattleDurationStatsResponseDto_Output;

export type BattlesControllerGetPhGrowthQuery =
  typeof BattlesControllerGetPhGrowthQuery.Type;

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
  startDate: Schema.optionalKey(DateTimeString),
  endDate: Schema.optionalKey(DateTimeString),
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
  typeof BattlesControllerGetPhGrowth200.Type;

export const BattlesControllerGetPhGrowth200 = Schema.Array(
  PhGrowthDataPointResponseDto_Output,
);

export type BattlesControllerGetRatingGrowthQuery =
  typeof BattlesControllerGetRatingGrowthQuery.Type;

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
  startDate: Schema.optionalKey(DateTimeString),
  endDate: Schema.optionalKey(DateTimeString),
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
  typeof BattlesControllerGetRatingGrowth200.Type;

export const BattlesControllerGetRatingGrowth200 = Schema.Array(
  RatingGrowthDataPointResponseDto_Output,
);

export type BattlesControllerGetRatingDeltaByOpponentQuery =
  typeof BattlesControllerGetRatingDeltaByOpponentQuery.Type;

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
  startDate: Schema.optionalKey(DateTimeString),
  endDate: Schema.optionalKey(DateTimeString),
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
  typeof BattlesControllerGetRatingDeltaByOpponent200.Type;

export const BattlesControllerGetRatingDeltaByOpponent200 = Schema.Array(
  RatingDeltaByOpponentResponseDto_Output,
);

export type BattlesControllerGetPlayerVsPlayerBattlesQuery =
  typeof BattlesControllerGetPlayerVsPlayerBattlesQuery.Type;

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
  startDate: Schema.optionalKey(DateTimeString),
  endDate: Schema.optionalKey(DateTimeString),
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
  typeof BattlesControllerGetPlayerVsPlayerBattles200.Type;

export const BattlesControllerGetPlayerVsPlayerBattles200 =
  PlayerVsPlayerPaginatedResponseDto_Output;

export type BattlesControllerSearchWarriorsQuery =
  typeof BattlesControllerSearchWarriorsQuery.Type;

export const BattlesControllerSearchWarriorsQuery = Schema.Struct({
  q: Schema.String,
});

export type BattlesControllerSearchWarriors200 =
  typeof BattlesControllerSearchWarriors200.Type;

export const BattlesControllerSearchWarriors200 =
  BattleWarriorsSearchResponseDto_Output;

export type BattlesControllerGetUserWorlds200 =
  typeof BattlesControllerGetUserWorlds200.Type;

export const BattlesControllerGetUserWorlds200 =
  BattleUserWorldsResponseDto_Output;

export type BattlesControllerGetBattleTimelinePathParams =
  typeof BattlesControllerGetBattleTimelinePathParams.Type;

export const BattlesControllerGetBattleTimelinePathParams = Schema.Struct({
  battleId: Schema.String,
});

export type BattlesControllerGetBattleTimeline200 =
  typeof BattlesControllerGetBattleTimeline200.Type;

export const BattlesControllerGetBattleTimeline200 =
  BattleTimelineResponseDto_Output;

export type BattlesControllerGetBattlePathParams =
  typeof BattlesControllerGetBattlePathParams.Type;

export const BattlesControllerGetBattlePathParams = Schema.Struct({
  battleId: Schema.String,
});

export type BattlesControllerGetBattle200 =
  typeof BattlesControllerGetBattle200.Type;

export const BattlesControllerGetBattle200 = BattleResponseDto_Output;

export type BattlesControllerDeleteBattlePathParams =
  typeof BattlesControllerDeleteBattlePathParams.Type;

export const BattlesControllerDeleteBattlePathParams = Schema.Struct({
  battleId: Schema.String,
});

export type BattlesControllerDeleteBattle200 =
  typeof BattlesControllerDeleteBattle200.Type;

export const BattlesControllerDeleteBattle200 = BattleDeletedResponseDto_Output;

export type BattlesControllerUpdateBattlePathParams =
  typeof BattlesControllerUpdateBattlePathParams.Type;

export const BattlesControllerUpdateBattlePathParams = Schema.Struct({
  battleId: Schema.String,
});

export type BattlesControllerUpdateBattleRequestJson =
  typeof BattlesControllerUpdateBattleRequestJson.Type;

export const BattlesControllerUpdateBattleRequestJson = UpdateBattleDto;

export type BattlesControllerUpdateBattle200 =
  typeof BattlesControllerUpdateBattle200.Type;

export const BattlesControllerUpdateBattle200 = BattleResponseDto_Output;

export type BattlesControllerGetBattleRawDataPathParams =
  typeof BattlesControllerGetBattleRawDataPathParams.Type;

export const BattlesControllerGetBattleRawDataPathParams = Schema.Struct({
  battleId: Schema.String,
});

export type BattlesControllerGetBattleRawData200 =
  typeof BattlesControllerGetBattleRawData200.Type;

export const BattlesControllerGetBattleRawData200 = BattleRawResponseDto_Output;
