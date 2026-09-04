/** Shared input and output schemas for the timers feature. */
import * as Schema from "effect/Schema";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";
import { ProfessionSchema } from "@lootlog/schema/loot";
import {
  NonEmptyString,
  PositiveSafeInteger,
  JsonValue,
  DateTimeString,
  FiniteNumber,
} from "#src/contracts/scalars";
import { MemberProfile } from "#src/contracts/members/schemas";

const TimerNpc = Schema.Struct({
  id: FiniteNumber,
  name: Schema.String,
  prof: Schema.String,
  location: Schema.String,
  wt: Schema.String,
  lvl: FiniteNumber,
  type: NpcTypeSchema,
  icon: Schema.Union([Schema.String, Schema.Null]),
  margonemType: Schema.String,
});

const TimerActorCharacter = Schema.Struct({
  name: Schema.String,
  prof: Schema.Union([ProfessionSchema, Schema.Null]),
  icon: Schema.Union([Schema.String, Schema.Null]),
  lvl: Schema.Union([FiniteNumber, Schema.Null]),
  characterId: FiniteNumber,
  accountId: FiniteNumber,
});

const TimerActorCharacterInput = Schema.Struct({
  accountId: NonEmptyString,
  characterId: NonEmptyString,
  name: NonEmptyString.check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  prof: Schema.optionalKey(Schema.String),
  icon: Schema.optionalKey(Schema.String),
  lvl: Schema.optionalKey(PositiveSafeInteger),
});

export type TimerResponse = typeof TimerResponse.Type;

export const TimerResponse = Schema.Struct({
  guildId: Schema.String,
  npcId: FiniteNumber,
  timerKey: Schema.String,
  world: Schema.String,
  minSpawnTime: DateTimeString,
  maxSpawnTime: DateTimeString,
  npc: TimerNpc,
  wasReset: Schema.Boolean,
  member: Schema.optionalKey(MemberProfile),
  actorCharacter: Schema.optionalKey(TimerActorCharacter),
  deletedAt: Schema.optionalKey(Schema.Union([DateTimeString, Schema.Null])),
  updatedAt: DateTimeString,
}).annotate({ identifier: "TimerResponseDto" });

export type TimerHistoryResponse = typeof TimerHistoryResponse.Type;

export const TimerHistoryResponse = Schema.Struct({
  id: FiniteNumber,
  guildId: Schema.String,
  guildName: Schema.String,
  world: Schema.String,
  timerKey: Schema.String,
  npcId: FiniteNumber,
  npc: TimerNpc,
  action: Schema.Literals(["CREATE", "RESET", "DELETE", "RESTORE"]),
  member: MemberProfile,
  actorCharacter: Schema.optionalKey(TimerActorCharacter),
  minSpawnTime: Schema.Union([DateTimeString, Schema.Null]),
  maxSpawnTime: Schema.Union([DateTimeString, Schema.Null]),
  canRestore: Schema.Boolean,
  createdAt: DateTimeString,
}).annotate({ identifier: "TimerHistoryResponseDto" });

export type TimerNpcSearchResult = typeof TimerNpcSearchResult.Type;

export const TimerNpcSearchResult = Schema.Struct({
  npcId: FiniteNumber,
  timerKey: Schema.String,
  name: Schema.String,
  lvl: FiniteNumber,
  type: NpcTypeSchema,
  prof: Schema.String,
  location: Schema.String,
  wt: Schema.Union([Schema.String, FiniteNumber]),
  icon: Schema.String,
  latestRespBaseSeconds: Schema.Union([FiniteNumber, Schema.Null]),
  latestRespawnRandomness: Schema.Union([FiniteNumber, Schema.Null]),
}).annotate({ identifier: "SearchTimersNpcResponseDto_Output" });

export type CreateAutoTimerRequest = typeof CreateAutoTimerRequest.Type;

export const CreateAutoTimerRequest = Schema.Struct({
  respBaseSeconds: FiniteNumber.check(
    Schema.isGreaterThanOrEqualTo(2).annotate({
      expected: "a value greater than or equal to 2",
    }),
  ),
  respawnRandomness: Schema.optionalKey(FiniteNumber),
  customMinSpawnTime: Schema.optionalKey(DateTimeString),
  customMaxSpawnTime: Schema.optionalKey(DateTimeString),
  world: NonEmptyString,
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
  characterId: NonEmptyString,
  accountId: NonEmptyString,
  actorCharacter: Schema.optionalKey(TimerActorCharacterInput),
}).annotate({ identifier: "CreateTimerFromGameClientDto" });

export type CreateAutoTimerResponse = typeof CreateAutoTimerResponse.Type;

export const CreateAutoTimerResponse = Schema.Struct({
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

export type ResetTimerRequest = typeof ResetTimerRequest.Type;

export const ResetTimerRequest = Schema.Struct({
  world: NonEmptyString,
  actorCharacter: Schema.optionalKey(TimerActorCharacterInput),
}).annotate({ identifier: "ResetTimerDto" });

export type CreateManualTimerRequest = typeof CreateManualTimerRequest.Type;

export const CreateManualTimerRequest = Schema.Struct({
  name: NonEmptyString.check(
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
  world: NonEmptyString,
  actorCharacter: Schema.optionalKey(TimerActorCharacterInput),
}).annotate({ identifier: "CreateManualTimerDto" });

export type TimersQuery = typeof TimersQuery.Type;

export const TimersQuery = Schema.Struct({
  world: Schema.optionalKey(Schema.String),
});

export type TimersResponse = typeof TimersResponse.Type;

export const TimersResponse = Schema.Array(TimerResponse);

export type RecentTimerHistoryQuery = typeof RecentTimerHistoryQuery.Type;

export const RecentTimerHistoryQuery = Schema.Struct({
  guildId: Schema.String,
  world: Schema.String,
  limit: Schema.optionalKey(JsonValue),
});

export type TimerHistoryListResponse = typeof TimerHistoryListResponse.Type;

export const TimerHistoryListResponse = Schema.Array(TimerHistoryResponse);

export type TimerListOrganizationPath = typeof TimerListOrganizationPath.Type;

export const TimerListOrganizationPath = Schema.Struct({
  guildId: JsonValue,
});

export type TimerOrganizationPath = typeof TimerOrganizationPath.Type;

export const TimerOrganizationPath = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type TimerNpcSearchQuery = typeof TimerNpcSearchQuery.Type;

export const TimerNpcSearchQuery = Schema.Struct({
  search: NonEmptyString,
  world: NonEmptyString,
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

export type TimerNpcSearchResponse = typeof TimerNpcSearchResponse.Type;

export const TimerNpcSearchResponse = Schema.Array(TimerNpcSearchResult);

export type TimerPath = typeof TimerPath.Type;

export const TimerPath = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  timerIdentifier: Schema.String.annotate({ examples: ["12345:test boss"] }),
});

export type TimerHistoryQuery = typeof TimerHistoryQuery.Type;

export const TimerHistoryQuery = Schema.Struct({
  world: Schema.String,
  limit: Schema.optionalKey(JsonValue),
});

export type TimerHistoryEntryPath = typeof TimerHistoryEntryPath.Type;

export const TimerHistoryEntryPath = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  historyEntryId: Schema.String,
});
