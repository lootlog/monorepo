/** Transport schemas owned by the guilds HTTP module. */
import * as Schema from "effect/Schema";
import {
  DateTimeWithOffsetString,
  DateTimeString,
  FiniteNumber,
} from "../scalars.js";

export type PaginatedActivitiesResponseDto =
  typeof PaginatedActivitiesResponseDto.Type;

export const PaginatedActivitiesResponseDto = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      userId: Schema.String,
      guildId: Schema.String,
      discordId: Schema.String,
      type: Schema.Literals(["CONNECT_EVENT", "DISCONNECT_EVENT"]),
      source: Schema.Literals(["GAME", "WEB_APP"]),
      createdAt: DateTimeString,
      world: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
      details: Schema.optionalKey(
        Schema.Record(
          Schema.String,
          Schema.Json.annotate({ expected: "JSON value" }),
        ),
      ),
      actorSnapshot: Schema.optionalKey(
        Schema.Struct({
          id: Schema.String,
          accountId: FiniteNumber,
          characterId: FiniteNumber,
          name: Schema.String,
          clanName: Schema.optionalKey(
            Schema.Union([Schema.String, Schema.Null]),
          ),
          clanId: Schema.optionalKey(Schema.Union([FiniteNumber, Schema.Null])),
          icon: Schema.String,
          lvl: FiniteNumber,
          prof: Schema.String,
          source: Schema.Literals(["GAME", "WEB_APP"]),
          createdAt: DateTimeString,
        }),
      ),
    }),
  ),
  nextCursor: Schema.optionalKey(Schema.String),
  hasMore: Schema.Boolean,
}).annotate({ identifier: "PaginatedActivitiesResponseDto" });

export type ActorNameSuggestionsResponseDto_Output =
  typeof ActorNameSuggestionsResponseDto_Output.Type;

export const ActorNameSuggestionsResponseDto_Output = Schema.Struct({
  suggestions: Schema.Array(Schema.String),
}).annotate({ identifier: "ActorNameSuggestionsResponseDto_Output" });

export type WorldSuggestionsResponseDto_Output =
  typeof WorldSuggestionsResponseDto_Output.Type;

export const WorldSuggestionsResponseDto_Output = Schema.Struct({
  worlds: Schema.Array(Schema.String),
}).annotate({ identifier: "WorldSuggestionsResponseDto_Output" });

export type ClanNameSuggestionsResponseDto_Output =
  typeof ClanNameSuggestionsResponseDto_Output.Type;

export const ClanNameSuggestionsResponseDto_Output = Schema.Struct({
  suggestions: Schema.Array(Schema.String),
}).annotate({ identifier: "ClanNameSuggestionsResponseDto_Output" });

export type MemberActivityStatsResponseDto =
  typeof MemberActivityStatsResponseDto.Type;

export const MemberActivityStatsResponseDto = Schema.Struct({
  guildId: Schema.String,
  discordId: Schema.String,
  source: Schema.Literals(["GAME", "WEB_APP"]),
  lastSeenAt: Schema.optionalKey(
    Schema.Union([
      Schema.String.check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      Schema.Null,
    ]).annotate({ format: "date-time" }),
  ),
  visitCount: FiniteNumber,
  activeSessionCount: FiniteNumber,
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
}).annotate({ identifier: "MemberActivityStatsResponseDto" });

export type ActivityResponseDto = typeof ActivityResponseDto.Type;

export const ActivityResponseDto = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  guildId: Schema.String,
  discordId: Schema.String,
  type: Schema.Literals(["CONNECT_EVENT", "DISCONNECT_EVENT"]),
  source: Schema.Literals(["GAME", "WEB_APP"]),
  createdAt: DateTimeString,
  world: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  details: Schema.optionalKey(
    Schema.Record(
      Schema.String,
      Schema.Json.annotate({ expected: "JSON value" }),
    ),
  ),
  actorSnapshot: Schema.optionalKey(
    Schema.Struct({
      id: Schema.String,
      accountId: FiniteNumber,
      characterId: FiniteNumber,
      name: Schema.String,
      clanName: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
      clanId: Schema.optionalKey(Schema.Union([FiniteNumber, Schema.Null])),
      icon: Schema.String,
      lvl: FiniteNumber,
      prof: Schema.String,
      source: Schema.Literals(["GAME", "WEB_APP"]),
      createdAt: DateTimeString,
    }),
  ),
}).annotate({ identifier: "ActivityResponseDto" });

export type DeleteActivityResponseDto_Output =
  typeof DeleteActivityResponseDto_Output.Type;

export const DeleteActivityResponseDto_Output = Schema.Struct({
  count: FiniteNumber,
}).annotate({ identifier: "DeleteActivityResponseDto_Output" });

export type ActivitiesControllerFindByGuildPathParams =
  typeof ActivitiesControllerFindByGuildPathParams.Type;

export const ActivitiesControllerFindByGuildPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ActivitiesControllerFindByGuildQuery =
  typeof ActivitiesControllerFindByGuildQuery.Type;

export const ActivitiesControllerFindByGuildQuery = Schema.Struct({
  type: Schema.optionalKey(
    Schema.Array(Schema.Literals(["CONNECT_EVENT", "DISCONNECT_EVENT"])),
  ),
  source: Schema.optionalKey(
    Schema.Array(Schema.Literals(["GAME", "WEB_APP"])),
  ),
  playerName: Schema.optionalKey(Schema.String),
  clanName: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  startDate: Schema.optionalKey(DateTimeWithOffsetString),
  endDate: Schema.optionalKey(DateTimeWithOffsetString),
  cursor: Schema.optionalKey(Schema.String),
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 50 })
      .check(Schema.isInt().annotate({ expected: "an integer" }))
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
});

export type ActivitiesControllerFindByGuild200 =
  typeof ActivitiesControllerFindByGuild200.Type;

export const ActivitiesControllerFindByGuild200 =
  PaginatedActivitiesResponseDto;

export type ActivitiesControllerSuggestActorNamesPathParams =
  typeof ActivitiesControllerSuggestActorNamesPathParams.Type;

export const ActivitiesControllerSuggestActorNamesPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ActivitiesControllerSuggestActorNamesQuery =
  typeof ActivitiesControllerSuggestActorNamesQuery.Type;

export const ActivitiesControllerSuggestActorNamesQuery = Schema.Struct({
  search: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  ),
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 })
      .check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(50).annotate({
          expected: "a value less than or equal to 50",
        }),
      ),
  ),
});

export type ActivitiesControllerSuggestActorNames200 =
  typeof ActivitiesControllerSuggestActorNames200.Type;

export const ActivitiesControllerSuggestActorNames200 =
  ActorNameSuggestionsResponseDto_Output;

export type ActivitiesControllerSuggestWorldsPathParams =
  typeof ActivitiesControllerSuggestWorldsPathParams.Type;

export const ActivitiesControllerSuggestWorldsPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ActivitiesControllerSuggestWorldsQuery =
  typeof ActivitiesControllerSuggestWorldsQuery.Type;

export const ActivitiesControllerSuggestWorldsQuery = Schema.Struct({
  search: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  ),
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 20 })
      .check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(50).annotate({
          expected: "a value less than or equal to 50",
        }),
      ),
  ),
});

export type ActivitiesControllerSuggestWorlds200 =
  typeof ActivitiesControllerSuggestWorlds200.Type;

export const ActivitiesControllerSuggestWorlds200 =
  WorldSuggestionsResponseDto_Output;

export type ActivitiesControllerSuggestClanNamesPathParams =
  typeof ActivitiesControllerSuggestClanNamesPathParams.Type;

export const ActivitiesControllerSuggestClanNamesPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ActivitiesControllerSuggestClanNamesQuery =
  typeof ActivitiesControllerSuggestClanNamesQuery.Type;

export const ActivitiesControllerSuggestClanNamesQuery = Schema.Struct({
  search: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  ),
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 })
      .check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(50).annotate({
          expected: "a value less than or equal to 50",
        }),
      ),
  ),
});

export type ActivitiesControllerSuggestClanNames200 =
  typeof ActivitiesControllerSuggestClanNames200.Type;

export const ActivitiesControllerSuggestClanNames200 =
  ClanNameSuggestionsResponseDto_Output;

export type ActivitiesControllerFindByUserPathParams =
  typeof ActivitiesControllerFindByUserPathParams.Type;

export const ActivitiesControllerFindByUserPathParams = Schema.Struct({
  guildId: Schema.String,
  userId: Schema.String,
});

export type ActivitiesControllerFindByUserQuery =
  typeof ActivitiesControllerFindByUserQuery.Type;

export const ActivitiesControllerFindByUserQuery = Schema.Struct({
  type: Schema.optionalKey(
    Schema.Array(Schema.Literals(["CONNECT_EVENT", "DISCONNECT_EVENT"])),
  ),
  source: Schema.optionalKey(
    Schema.Array(Schema.Literals(["GAME", "WEB_APP"])),
  ),
  playerName: Schema.optionalKey(Schema.String),
  clanName: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  startDate: Schema.optionalKey(DateTimeWithOffsetString),
  endDate: Schema.optionalKey(DateTimeWithOffsetString),
  cursor: Schema.optionalKey(Schema.String),
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 50 })
      .check(Schema.isInt().annotate({ expected: "an integer" }))
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
});

export type ActivitiesControllerFindByUser200 =
  typeof ActivitiesControllerFindByUser200.Type;

export const ActivitiesControllerFindByUser200 = PaginatedActivitiesResponseDto;

export type ActivitiesControllerGetMemberActivityStatsPathParams =
  typeof ActivitiesControllerGetMemberActivityStatsPathParams.Type;

export const ActivitiesControllerGetMemberActivityStatsPathParams =
  Schema.Struct({ guildId: Schema.String });

export type ActivitiesControllerGetMemberActivityStats200 =
  typeof ActivitiesControllerGetMemberActivityStats200.Type;

export const ActivitiesControllerGetMemberActivityStats200 = Schema.Array(
  MemberActivityStatsResponseDto,
);

export type ActivitiesControllerFindOnePathParams =
  typeof ActivitiesControllerFindOnePathParams.Type;

export const ActivitiesControllerFindOnePathParams = Schema.Struct({
  guildId: Schema.String,
  id: Schema.String,
});

export type ActivitiesControllerFindOne200 =
  typeof ActivitiesControllerFindOne200.Type;

export const ActivitiesControllerFindOne200 = ActivityResponseDto;

export type ActivitiesControllerDeleteActivityPathParams =
  typeof ActivitiesControllerDeleteActivityPathParams.Type;

export const ActivitiesControllerDeleteActivityPathParams = Schema.Struct({
  guildId: Schema.String,
  id: Schema.String,
});

export type ActivitiesControllerDeleteActivity200 =
  typeof ActivitiesControllerDeleteActivity200.Type;

export const ActivitiesControllerDeleteActivity200 =
  DeleteActivityResponseDto_Output;
