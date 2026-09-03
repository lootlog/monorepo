/** Transport schemas owned by the guilds HTTP module. */
import * as Schema from "effect/Schema";

export type PaginatedActivitiesResponseDto = {
  readonly data: ReadonlyArray<{
    readonly id: string;
    readonly userId: string;
    readonly guildId: string;
    readonly discordId: string;
    readonly type: "CONNECT_EVENT" | "DISCONNECT_EVENT";
    readonly source: "GAME" | "WEB_APP";
    readonly createdAt: string;
    readonly world?: string | null;
    readonly details?: { readonly [x: string]: Schema.Json };
    readonly actorSnapshot?: {
      readonly id: string;
      readonly accountId: number;
      readonly characterId: number;
      readonly name: string;
      readonly clanName?: string | null;
      readonly clanId?: number | null;
      readonly icon: string;
      readonly lvl: number;
      readonly prof: string;
      readonly source: "GAME" | "WEB_APP";
      readonly createdAt: string;
    };
  }>;
  readonly nextCursor?: string;
  readonly hasMore: boolean;
};

export const PaginatedActivitiesResponseDto = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      userId: Schema.String,
      guildId: Schema.String,
      discordId: Schema.String,
      type: Schema.Literals(["CONNECT_EVENT", "DISCONNECT_EVENT"]),
      source: Schema.Literals(["GAME", "WEB_APP"]),
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
          accountId: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          characterId: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          name: Schema.String,
          clanName: Schema.optionalKey(
            Schema.Union([Schema.String, Schema.Null]),
          ),
          clanId: Schema.optionalKey(
            Schema.Union([
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              Schema.Null,
            ]),
          ),
          icon: Schema.String,
          lvl: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          prof: Schema.String,
          source: Schema.Literals(["GAME", "WEB_APP"]),
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
        }),
      ),
    }),
  ),
  nextCursor: Schema.optionalKey(Schema.String),
  hasMore: Schema.Boolean,
}).annotate({ identifier: "PaginatedActivitiesResponseDto" });

export type ActorNameSuggestionsResponseDto_Output = {
  readonly suggestions: ReadonlyArray<string>;
};

export const ActorNameSuggestionsResponseDto_Output = Schema.Struct({
  suggestions: Schema.Array(Schema.String),
}).annotate({ identifier: "ActorNameSuggestionsResponseDto_Output" });

export type WorldSuggestionsResponseDto_Output = {
  readonly worlds: ReadonlyArray<string>;
};

export const WorldSuggestionsResponseDto_Output = Schema.Struct({
  worlds: Schema.Array(Schema.String),
}).annotate({ identifier: "WorldSuggestionsResponseDto_Output" });

export type ClanNameSuggestionsResponseDto_Output = {
  readonly suggestions: ReadonlyArray<string>;
};

export const ClanNameSuggestionsResponseDto_Output = Schema.Struct({
  suggestions: Schema.Array(Schema.String),
}).annotate({ identifier: "ClanNameSuggestionsResponseDto_Output" });

export type MemberActivityStatsResponseDto = {
  readonly guildId: string;
  readonly discordId: string;
  readonly source: "GAME" | "WEB_APP";
  readonly lastSeenAt?: string | null;
  readonly visitCount: number;
  readonly activeSessionCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

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
  visitCount: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  activeSessionCount: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
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
}).annotate({ identifier: "MemberActivityStatsResponseDto" });

export type ActivityResponseDto = {
  readonly id: string;
  readonly userId: string;
  readonly guildId: string;
  readonly discordId: string;
  readonly type: "CONNECT_EVENT" | "DISCONNECT_EVENT";
  readonly source: "GAME" | "WEB_APP";
  readonly createdAt: string;
  readonly world?: string | null;
  readonly details?: { readonly [x: string]: Schema.Json };
  readonly actorSnapshot?: {
    readonly id: string;
    readonly accountId: number;
    readonly characterId: number;
    readonly name: string;
    readonly clanName?: string | null;
    readonly clanId?: number | null;
    readonly icon: string;
    readonly lvl: number;
    readonly prof: string;
    readonly source: "GAME" | "WEB_APP";
    readonly createdAt: string;
  };
};

export const ActivityResponseDto = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  guildId: Schema.String,
  discordId: Schema.String,
  type: Schema.Literals(["CONNECT_EVENT", "DISCONNECT_EVENT"]),
  source: Schema.Literals(["GAME", "WEB_APP"]),
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
      accountId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      characterId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      name: Schema.String,
      clanName: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
      clanId: Schema.optionalKey(
        Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
      ),
      icon: Schema.String,
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      prof: Schema.String,
      source: Schema.Literals(["GAME", "WEB_APP"]),
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
    }),
  ),
}).annotate({ identifier: "ActivityResponseDto" });

export type DeleteActivityResponseDto_Output = { readonly count: number };

export const DeleteActivityResponseDto_Output = Schema.Struct({
  count: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
}).annotate({ identifier: "DeleteActivityResponseDto_Output" });

export type ActivitiesControllerFindByGuildPathParams = {
  readonly guildId: string;
};

export const ActivitiesControllerFindByGuildPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ActivitiesControllerFindByGuildQuery = {
  readonly type?: ReadonlyArray<"CONNECT_EVENT" | "DISCONNECT_EVENT">;
  readonly source?: ReadonlyArray<"GAME" | "WEB_APP">;
  readonly playerName?: string;
  readonly clanName?: string;
  readonly world?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly limit?: number;
};

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
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
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

export type ActivitiesControllerFindByGuild200 = PaginatedActivitiesResponseDto;

export const ActivitiesControllerFindByGuild200 =
  PaginatedActivitiesResponseDto;

export type ActivitiesControllerSuggestActorNamesPathParams = {
  readonly guildId: string;
};

export const ActivitiesControllerSuggestActorNamesPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ActivitiesControllerSuggestActorNamesQuery = {
  readonly search?: string;
  readonly limit?: number;
};

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
  ActorNameSuggestionsResponseDto_Output;

export const ActivitiesControllerSuggestActorNames200 =
  ActorNameSuggestionsResponseDto_Output;

export type ActivitiesControllerSuggestWorldsPathParams = {
  readonly guildId: string;
};

export const ActivitiesControllerSuggestWorldsPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ActivitiesControllerSuggestWorldsQuery = {
  readonly search?: string;
  readonly limit?: number;
};

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
  WorldSuggestionsResponseDto_Output;

export const ActivitiesControllerSuggestWorlds200 =
  WorldSuggestionsResponseDto_Output;

export type ActivitiesControllerSuggestClanNamesPathParams = {
  readonly guildId: string;
};

export const ActivitiesControllerSuggestClanNamesPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ActivitiesControllerSuggestClanNamesQuery = {
  readonly search?: string;
  readonly limit?: number;
};

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
  ClanNameSuggestionsResponseDto_Output;

export const ActivitiesControllerSuggestClanNames200 =
  ClanNameSuggestionsResponseDto_Output;

export type ActivitiesControllerFindByUserPathParams = {
  readonly guildId: string;
  readonly userId: string;
};

export const ActivitiesControllerFindByUserPathParams = Schema.Struct({
  guildId: Schema.String,
  userId: Schema.String,
});

export type ActivitiesControllerFindByUserQuery = {
  readonly type?: ReadonlyArray<"CONNECT_EVENT" | "DISCONNECT_EVENT">;
  readonly source?: ReadonlyArray<"GAME" | "WEB_APP">;
  readonly playerName?: string;
  readonly clanName?: string;
  readonly world?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly limit?: number;
};

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
  startDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
  endDate: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
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

export type ActivitiesControllerFindByUser200 = PaginatedActivitiesResponseDto;

export const ActivitiesControllerFindByUser200 = PaginatedActivitiesResponseDto;

export type ActivitiesControllerGetMemberActivityStatsPathParams = {
  readonly guildId: string;
};

export const ActivitiesControllerGetMemberActivityStatsPathParams =
  Schema.Struct({ guildId: Schema.String });

export type ActivitiesControllerGetMemberActivityStats200 =
  ReadonlyArray<MemberActivityStatsResponseDto>;

export const ActivitiesControllerGetMemberActivityStats200 = Schema.Array(
  MemberActivityStatsResponseDto,
);

export type ActivitiesControllerFindOnePathParams = {
  readonly guildId: string;
  readonly id: string;
};

export const ActivitiesControllerFindOnePathParams = Schema.Struct({
  guildId: Schema.String,
  id: Schema.String,
});

export type ActivitiesControllerFindOne200 = ActivityResponseDto;

export const ActivitiesControllerFindOne200 = ActivityResponseDto;

export type ActivitiesControllerDeleteActivityPathParams = {
  readonly guildId: string;
  readonly id: string;
};

export const ActivitiesControllerDeleteActivityPathParams = Schema.Struct({
  guildId: Schema.String,
  id: Schema.String,
});

export type ActivitiesControllerDeleteActivity200 =
  DeleteActivityResponseDto_Output;

export const ActivitiesControllerDeleteActivity200 =
  DeleteActivityResponseDto_Output;
