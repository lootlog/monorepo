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

// schemas
export type BattlesControllerCreateBattleRequestJson = CreateBattleDto;

export const BattlesControllerCreateBattleRequestJson = CreateBattleDto;

export type BattlesControllerCreateBattle201 = BattleCreatedResponseDto_Output;

export const BattlesControllerCreateBattle201 = BattleCreatedResponseDto_Output;

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
