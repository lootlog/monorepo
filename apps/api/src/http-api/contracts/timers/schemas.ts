/** Transport schemas owned by the timers HTTP module. */
import * as Schema from "effect/Schema";
import { DateTimeString, FiniteNumber } from "../scalars.js";

export type TimerResponseDto = typeof TimerResponseDto.Type;

export const TimerResponseDto = Schema.Struct({
  guildId: Schema.String,
  npcId: FiniteNumber,
  timerKey: Schema.String,
  world: Schema.String,
  minSpawnTime: DateTimeString,
  maxSpawnTime: DateTimeString,
  npc: Schema.Struct({
    id: FiniteNumber,
    name: Schema.String,
    prof: Schema.String,
    location: Schema.String,
    wt: Schema.String,
    lvl: FiniteNumber,
    type: Schema.Literals([
      "COMMON",
      "ELITE",
      "ELITE2",
      "ELITE3",
      "HERO",
      "EVENT_HERO",
      "TITAN",
      "COLOSSUS",
      "NPC",
    ]),
    icon: Schema.Union([Schema.String, Schema.Null]),
    margonemType: Schema.String,
  }),
  wasReset: Schema.Boolean,
  member: Schema.optionalKey(
    Schema.Struct({
      id: FiniteNumber,
      userId: Schema.String,
      guildId: Schema.String,
      type: Schema.Literals(["OWNER", "ADMIN", "USER", "BOT"]),
      name: Schema.String,
      avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
      banner: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
      active: Schema.Boolean,
      roles: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          guildId: Schema.String,
          name: Schema.String,
          color: Schema.Union([FiniteNumber, Schema.Null]),
          position: Schema.optionalKey(
            Schema.Union([FiniteNumber, Schema.Null]),
          ),
          permissions: Schema.Array(
            Schema.Literals([
              "OWNER",
              "ADMIN",
              "LOOTLOG_MANAGE",
              "LOOTLOG_ACCESS",
              "LOOTLOG_LOOTS_READ",
              "LOOTLOG_LOOTS_WRITE",
              "LOOTLOG_LOOTS_ARCHIVE",
              "LOOTLOG_LOOTS_TITANS_READ",
              "LOOTLOG_LOOTS_HEROES_READ",
              "LOOTLOG_TIMERS_READ",
              "LOOTLOG_TIMERS_WRITE",
              "LOOTLOG_TIMERS_RESET",
              "LOOTLOG_TIMERS_DELETE",
              "LOOTLOG_TIMERS_TITANS_READ",
              "LOOTLOG_TIMERS_HEROES_READ",
              "LOOTLOG_RESERVATIONS_READ",
              "LOOTLOG_RESERVATIONS_WRITE",
              "LOOTLOG_MEMBERS_READ",
              "LOOTLOG_ONLINE_PLAYERS_READ",
              "LOOTLOG_PRESENCE_LOCATION_READ",
              "LOOTLOG_CHAT_READ",
              "LOOTLOG_CHAT_WRITE",
              "LOOTLOG_CHAT_TITANS_READ",
              "LOOTLOG_CHAT_HEROES_READ",
              "LOOTLOG_NOTIFICATIONS_READ",
              "LOOTLOG_NOTIFICATIONS_SEND",
              "LOOTLOG_NOTIFICATIONS_TITANS_READ",
              "LOOTLOG_NOTIFICATIONS_HEROES_READ",
              "LOOTLOG_EVENTS_MANAGE",
              "LOOTLOG_EVENTS_READ",
              "LOOTLOG_EVENTS_WRITE",
              "LOOTLOG_DOCS_READ",
              "LOOTLOG_DOCS_WRITE",
            ]),
          ),
          lvlRangeFrom: Schema.optionalKey(
            Schema.Union([FiniteNumber, Schema.Null]),
          ),
          lvlRangeTo: Schema.optionalKey(
            Schema.Union([FiniteNumber, Schema.Null]),
          ),
        }),
      ),
      globalUserId: Schema.optionalKey(
        Schema.Union([Schema.String, Schema.Null]),
      ),
      lastDiscordSyncAt: Schema.optionalKey(
        Schema.Union([DateTimeString, Schema.Null]),
      ),
      lastDiscordAttemptAt: Schema.optionalKey(
        Schema.Union([DateTimeString, Schema.Null]),
      ),
      lastDiscordStatus: Schema.optionalKey(
        Schema.Union([Schema.String, Schema.Null]),
      ),
      isStale: Schema.optionalKey(Schema.Boolean),
      staleWarning: Schema.optionalKey(Schema.String),
      refreshQueued: Schema.optionalKey(Schema.Boolean),
      nextRefreshAt: Schema.optionalKey(
        Schema.Union([DateTimeString, Schema.Null]),
      ),
      updatedAt: DateTimeString,
    }),
  ),
  actorCharacter: Schema.optionalKey(
    Schema.Struct({
      name: Schema.String,
      prof: Schema.Union([
        Schema.Literals([
          "WARRIOR",
          "PALADIN",
          "HUNTER",
          "MAGE",
          "BLADE_DANCER",
          "TRACKER",
        ]),
        Schema.Null,
      ]),
      icon: Schema.Union([Schema.String, Schema.Null]),
      lvl: Schema.Union([FiniteNumber, Schema.Null]),
      characterId: FiniteNumber,
      accountId: FiniteNumber,
    }),
  ),
  deletedAt: Schema.optionalKey(Schema.Union([DateTimeString, Schema.Null])),
  updatedAt: DateTimeString,
}).annotate({ identifier: "TimerResponseDto" });

export type TimerHistoryResponseDto = typeof TimerHistoryResponseDto.Type;

export const TimerHistoryResponseDto = Schema.Struct({
  id: FiniteNumber,
  guildId: Schema.String,
  guildName: Schema.String,
  world: Schema.String,
  timerKey: Schema.String,
  npcId: FiniteNumber,
  npc: Schema.Struct({
    id: FiniteNumber,
    name: Schema.String,
    prof: Schema.String,
    location: Schema.String,
    wt: Schema.String,
    lvl: FiniteNumber,
    type: Schema.Literals([
      "COMMON",
      "ELITE",
      "ELITE2",
      "ELITE3",
      "HERO",
      "EVENT_HERO",
      "TITAN",
      "COLOSSUS",
      "NPC",
    ]),
    icon: Schema.Union([Schema.String, Schema.Null]),
    margonemType: Schema.String,
  }),
  action: Schema.Literals(["CREATE", "RESET", "DELETE", "RESTORE"]),
  member: Schema.Struct({
    id: FiniteNumber,
    userId: Schema.String,
    guildId: Schema.String,
    type: Schema.Literals(["OWNER", "ADMIN", "USER", "BOT"]),
    name: Schema.String,
    avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
    banner: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
    active: Schema.Boolean,
    roles: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        guildId: Schema.String,
        name: Schema.String,
        color: Schema.Union([FiniteNumber, Schema.Null]),
        position: Schema.optionalKey(Schema.Union([FiniteNumber, Schema.Null])),
        permissions: Schema.Array(
          Schema.Literals([
            "OWNER",
            "ADMIN",
            "LOOTLOG_MANAGE",
            "LOOTLOG_ACCESS",
            "LOOTLOG_LOOTS_READ",
            "LOOTLOG_LOOTS_WRITE",
            "LOOTLOG_LOOTS_ARCHIVE",
            "LOOTLOG_LOOTS_TITANS_READ",
            "LOOTLOG_LOOTS_HEROES_READ",
            "LOOTLOG_TIMERS_READ",
            "LOOTLOG_TIMERS_WRITE",
            "LOOTLOG_TIMERS_RESET",
            "LOOTLOG_TIMERS_DELETE",
            "LOOTLOG_TIMERS_TITANS_READ",
            "LOOTLOG_TIMERS_HEROES_READ",
            "LOOTLOG_RESERVATIONS_READ",
            "LOOTLOG_RESERVATIONS_WRITE",
            "LOOTLOG_MEMBERS_READ",
            "LOOTLOG_ONLINE_PLAYERS_READ",
            "LOOTLOG_PRESENCE_LOCATION_READ",
            "LOOTLOG_CHAT_READ",
            "LOOTLOG_CHAT_WRITE",
            "LOOTLOG_CHAT_TITANS_READ",
            "LOOTLOG_CHAT_HEROES_READ",
            "LOOTLOG_NOTIFICATIONS_READ",
            "LOOTLOG_NOTIFICATIONS_SEND",
            "LOOTLOG_NOTIFICATIONS_TITANS_READ",
            "LOOTLOG_NOTIFICATIONS_HEROES_READ",
            "LOOTLOG_EVENTS_MANAGE",
            "LOOTLOG_EVENTS_READ",
            "LOOTLOG_EVENTS_WRITE",
            "LOOTLOG_DOCS_READ",
            "LOOTLOG_DOCS_WRITE",
          ]),
        ),
        lvlRangeFrom: Schema.optionalKey(
          Schema.Union([FiniteNumber, Schema.Null]),
        ),
        lvlRangeTo: Schema.optionalKey(
          Schema.Union([FiniteNumber, Schema.Null]),
        ),
      }),
    ),
    globalUserId: Schema.optionalKey(
      Schema.Union([Schema.String, Schema.Null]),
    ),
    lastDiscordSyncAt: Schema.optionalKey(
      Schema.Union([DateTimeString, Schema.Null]),
    ),
    lastDiscordAttemptAt: Schema.optionalKey(
      Schema.Union([DateTimeString, Schema.Null]),
    ),
    lastDiscordStatus: Schema.optionalKey(
      Schema.Union([Schema.String, Schema.Null]),
    ),
    isStale: Schema.optionalKey(Schema.Boolean),
    staleWarning: Schema.optionalKey(Schema.String),
    refreshQueued: Schema.optionalKey(Schema.Boolean),
    nextRefreshAt: Schema.optionalKey(
      Schema.Union([DateTimeString, Schema.Null]),
    ),
    updatedAt: DateTimeString,
  }),
  actorCharacter: Schema.optionalKey(
    Schema.Struct({
      name: Schema.String,
      prof: Schema.Union([
        Schema.Literals([
          "WARRIOR",
          "PALADIN",
          "HUNTER",
          "MAGE",
          "BLADE_DANCER",
          "TRACKER",
        ]),
        Schema.Null,
      ]),
      icon: Schema.Union([Schema.String, Schema.Null]),
      lvl: Schema.Union([FiniteNumber, Schema.Null]),
      characterId: FiniteNumber,
      accountId: FiniteNumber,
    }),
  ),
  minSpawnTime: Schema.Union([DateTimeString, Schema.Null]),
  maxSpawnTime: Schema.Union([DateTimeString, Schema.Null]),
  canRestore: Schema.Boolean,
  createdAt: DateTimeString,
}).annotate({ identifier: "TimerHistoryResponseDto" });

export type SearchTimersNpcResponseDto_Output =
  typeof SearchTimersNpcResponseDto_Output.Type;

export const SearchTimersNpcResponseDto_Output = Schema.Struct({
  npcId: FiniteNumber,
  timerKey: Schema.String,
  name: Schema.String,
  lvl: FiniteNumber,
  type: Schema.Literals([
    "COMMON",
    "ELITE",
    "ELITE2",
    "ELITE3",
    "HERO",
    "EVENT_HERO",
    "TITAN",
    "COLOSSUS",
    "NPC",
  ]),
  prof: Schema.String,
  location: Schema.String,
  wt: Schema.Union([Schema.String, FiniteNumber]),
  icon: Schema.String,
  latestRespBaseSeconds: Schema.Union([FiniteNumber, Schema.Null]),
  latestRespawnRandomness: Schema.Union([FiniteNumber, Schema.Null]),
}).annotate({ identifier: "SearchTimersNpcResponseDto_Output" });

export type CreateTimerFromGameClientDto =
  typeof CreateTimerFromGameClientDto.Type;

export const CreateTimerFromGameClientDto = Schema.Struct({
  respBaseSeconds: FiniteNumber.check(
    Schema.isGreaterThanOrEqualTo(2).annotate({
      expected: "a value greater than or equal to 2",
    }),
  ),
  respawnRandomness: Schema.optionalKey(FiniteNumber),
  customMinSpawnTime: Schema.optionalKey(DateTimeString),
  customMaxSpawnTime: Schema.optionalKey(DateTimeString),
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  npc: Schema.Struct({
    id: FiniteNumber,
    name: Schema.String,
    location: Schema.String,
    lvl: FiniteNumber,
    prof: Schema.optionalKey(Schema.String),
    wt: FiniteNumber,
    hpp: Schema.optionalKey(FiniteNumber),
    icon: Schema.String,
    type: FiniteNumber,
    x: Schema.optionalKey(FiniteNumber),
    y: Schema.optionalKey(FiniteNumber),
  }),
  characterId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  accountId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  actorCharacter: Schema.optionalKey(
    Schema.Struct({
      accountId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      characterId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      name: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(50).annotate({
          expected: "a value with a length of at most 50",
        }),
      ),
      prof: Schema.optionalKey(Schema.String),
      icon: Schema.optionalKey(Schema.String),
      lvl: Schema.optionalKey(
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
    }),
  ),
}).annotate({ identifier: "CreateTimerFromGameClientDto" });

export type CreateAutoTimerResponseDto_Output =
  typeof CreateAutoTimerResponseDto_Output.Type;

export const CreateAutoTimerResponseDto_Output = Schema.Struct({
  submittedGuilds: Schema.Array(
    Schema.Struct({ guildId: Schema.String, guildName: Schema.String }),
  ),
  rejectedGuilds: Schema.Array(
    Schema.Struct({
      guildId: Schema.String,
      guildName: Schema.String,
      reason: Schema.Literals([
        "NOT_ON_CATCHING_WHITELIST",
        "TIMER_CREATE_FAILED",
      ]),
    }),
  ),
}).annotate({ identifier: "CreateAutoTimerResponseDto_Output" });

export type ResetTimerDto = typeof ResetTimerDto.Type;

export const ResetTimerDto = Schema.Struct({
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  actorCharacter: Schema.optionalKey(
    Schema.Struct({
      accountId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      characterId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      name: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(50).annotate({
          expected: "a value with a length of at most 50",
        }),
      ),
      prof: Schema.optionalKey(Schema.String),
      icon: Schema.optionalKey(Schema.String),
      lvl: Schema.optionalKey(
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
    }),
  ),
}).annotate({ identifier: "ResetTimerDto" });

export type CreateManualTimerDto = typeof CreateManualTimerDto.Type;

export const CreateManualTimerDto = Schema.Struct({
  name: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  minSeconds: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(1).annotate({
        expected: "a value greater than or equal to 1",
      }),
    ),
  ),
  maxSeconds: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(1).annotate({
        expected: "a value greater than or equal to 1",
      }),
    ),
  ),
  lvl: Schema.optionalKey(FiniteNumber),
  prof: Schema.optionalKey(Schema.String),
  type: Schema.optionalKey(
    Schema.Literals(["ELITE2", "ELITE3", "HERO", "TITAN"]),
  ),
  customMinSpawnTime: Schema.optionalKey(DateTimeString),
  customMaxSpawnTime: Schema.optionalKey(DateTimeString),
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  actorCharacter: Schema.optionalKey(
    Schema.Struct({
      accountId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      characterId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      name: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(50).annotate({
          expected: "a value with a length of at most 50",
        }),
      ),
      prof: Schema.optionalKey(Schema.String),
      icon: Schema.optionalKey(Schema.String),
      lvl: Schema.optionalKey(
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
    }),
  ),
}).annotate({ identifier: "CreateManualTimerDto" });

export type TimersControllerGetAllTimersQuery =
  typeof TimersControllerGetAllTimersQuery.Type;

export const TimersControllerGetAllTimersQuery = Schema.Struct({
  world: Schema.optionalKey(Schema.String),
});

export type TimersControllerGetAllTimers200 =
  typeof TimersControllerGetAllTimers200.Type;

export const TimersControllerGetAllTimers200 = Schema.Array(TimerResponseDto);

export type TimersControllerGetRecentTimerHistoryQuery =
  typeof TimersControllerGetRecentTimerHistoryQuery.Type;

export const TimersControllerGetRecentTimerHistoryQuery = Schema.Struct({
  guildId: Schema.String,
  world: Schema.String,
  limit: Schema.optionalKey(Schema.Json.annotate({ expected: "JSON value" })),
});

export type TimersControllerGetRecentTimerHistory200 =
  typeof TimersControllerGetRecentTimerHistory200.Type;

export const TimersControllerGetRecentTimerHistory200 = Schema.Array(
  TimerHistoryResponseDto,
);

export type TimersControllerGetTimersPathParams =
  typeof TimersControllerGetTimersPathParams.Type;

export const TimersControllerGetTimersPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type TimersControllerGetTimersQuery =
  typeof TimersControllerGetTimersQuery.Type;

export const TimersControllerGetTimersQuery = Schema.Struct({
  world: Schema.optionalKey(Schema.String),
});

export type TimersControllerGetTimers200 =
  typeof TimersControllerGetTimers200.Type;

export const TimersControllerGetTimers200 = Schema.Array(TimerResponseDto);

export type TimersControllerSearchNpcsWithTimerDataPathParams =
  typeof TimersControllerSearchNpcsWithTimerDataPathParams.Type;

export const TimersControllerSearchNpcsWithTimerDataPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type TimersControllerSearchNpcsWithTimerDataQuery =
  typeof TimersControllerSearchNpcsWithTimerDataQuery.Type;

export const TimersControllerSearchNpcsWithTimerDataQuery = Schema.Struct({
  search: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 })
      .check(Schema.isFinite().annotate({ expected: "a finite number" }))
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

export type TimersControllerSearchNpcsWithTimerData200 =
  typeof TimersControllerSearchNpcsWithTimerData200.Type;

export const TimersControllerSearchNpcsWithTimerData200 = Schema.Array(
  SearchTimersNpcResponseDto_Output,
);

export type TimersControllerCreateAutoTimerRequestJson =
  typeof TimersControllerCreateAutoTimerRequestJson.Type;

export const TimersControllerCreateAutoTimerRequestJson =
  CreateTimerFromGameClientDto;

export type TimersControllerCreateAutoTimer201 =
  typeof TimersControllerCreateAutoTimer201.Type;

export const TimersControllerCreateAutoTimer201 =
  CreateAutoTimerResponseDto_Output;

export type TimersControllerResetTimerPathParams =
  typeof TimersControllerResetTimerPathParams.Type;

export const TimersControllerResetTimerPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  timerIdentifier: Schema.String.annotate({ examples: ["12345:test boss"] }),
});

export type TimersControllerResetTimerRequestJson =
  typeof TimersControllerResetTimerRequestJson.Type;

export const TimersControllerResetTimerRequestJson = ResetTimerDto;

export type TimersControllerResetTimer200 =
  typeof TimersControllerResetTimer200.Type;

export const TimersControllerResetTimer200 = TimerResponseDto;

export type TimersControllerDeleteTimerPathParams =
  typeof TimersControllerDeleteTimerPathParams.Type;

export const TimersControllerDeleteTimerPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  timerIdentifier: Schema.String.annotate({ examples: ["12345:test boss"] }),
});

export type TimersControllerDeleteTimerQuery =
  typeof TimersControllerDeleteTimerQuery.Type;

export const TimersControllerDeleteTimerQuery = Schema.Struct({
  world: Schema.optionalKey(Schema.String),
});

export type TimersControllerGetTimerHistoryPathParams =
  typeof TimersControllerGetTimerHistoryPathParams.Type;

export const TimersControllerGetTimerHistoryPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  timerIdentifier: Schema.String.annotate({ examples: ["12345:test boss"] }),
});

export type TimersControllerGetTimerHistoryQuery =
  typeof TimersControllerGetTimerHistoryQuery.Type;

export const TimersControllerGetTimerHistoryQuery = Schema.Struct({
  world: Schema.String,
  limit: Schema.optionalKey(Schema.Json.annotate({ expected: "JSON value" })),
});

export type TimersControllerGetTimerHistory200 =
  typeof TimersControllerGetTimerHistory200.Type;

export const TimersControllerGetTimerHistory200 = Schema.Array(
  TimerHistoryResponseDto,
);

export type TimersControllerRestoreTimerFromHistoryPathParams =
  typeof TimersControllerRestoreTimerFromHistoryPathParams.Type;

export const TimersControllerRestoreTimerFromHistoryPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  historyEntryId: Schema.String,
});

export type TimersControllerRestoreTimerFromHistory201 =
  typeof TimersControllerRestoreTimerFromHistory201.Type;

export const TimersControllerRestoreTimerFromHistory201 = TimerResponseDto;

export type TimersControllerCreateManualTimerPathParams =
  typeof TimersControllerCreateManualTimerPathParams.Type;

export const TimersControllerCreateManualTimerPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type TimersControllerCreateManualTimerRequestJson =
  typeof TimersControllerCreateManualTimerRequestJson.Type;

export const TimersControllerCreateManualTimerRequestJson =
  CreateManualTimerDto;

export type TimersControllerCreateManualTimer201 =
  typeof TimersControllerCreateManualTimer201.Type;

export const TimersControllerCreateManualTimer201 = TimerResponseDto;
