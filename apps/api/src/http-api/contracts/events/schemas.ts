/** Transport schemas owned by the events HTTP module. */
import * as Schema from "effect/Schema";
import { SuccessResponseDto_Output } from "../shared.js";
import { DateTimeString, FiniteNumber } from "../scalars.js";

export type EventMutationResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<EventMutationResponseDto__schema0>
      | { readonly [x: string]: EventMutationResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<EventMutationResponseDto__schema0>
        | { readonly [x: string]: EventMutationResponseDto__schema0 }
        | null;
    }
  | null;

export const EventMutationResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<EventMutationResponseDto__schema0> =>
    __recursive_EventMutationResponseDto__schema0,
);

export type EventOverviewResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<EventOverviewResponseDto__schema0>
      | { readonly [x: string]: EventOverviewResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<EventOverviewResponseDto__schema0>
        | { readonly [x: string]: EventOverviewResponseDto__schema0 }
        | null;
    }
  | null;

export const EventOverviewResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<EventOverviewResponseDto__schema0> =>
    __recursive_EventOverviewResponseDto__schema0,
);

export type EventKillHistoryResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<EventKillHistoryResponseDto__schema0>
      | { readonly [x: string]: EventKillHistoryResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<EventKillHistoryResponseDto__schema0>
        | { readonly [x: string]: EventKillHistoryResponseDto__schema0 }
        | null;
    }
  | null;

export const EventKillHistoryResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<EventKillHistoryResponseDto__schema0> =>
    __recursive_EventKillHistoryResponseDto__schema0,
);

export type EventMemberKillHistoryResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<EventMemberKillHistoryResponseDto__schema0>
      | { readonly [x: string]: EventMemberKillHistoryResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<EventMemberKillHistoryResponseDto__schema0>
        | { readonly [x: string]: EventMemberKillHistoryResponseDto__schema0 }
        | null;
    }
  | null;

export const EventMemberKillHistoryResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<EventMemberKillHistoryResponseDto__schema0> =>
    __recursive_EventMemberKillHistoryResponseDto__schema0,
);

export type KillDetailResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<KillDetailResponseDto__schema0>
      | { readonly [x: string]: KillDetailResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<KillDetailResponseDto__schema0>
        | { readonly [x: string]: KillDetailResponseDto__schema0 }
        | null;
    }
  | null;

export const KillDetailResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<KillDetailResponseDto__schema0> =>
    __recursive_KillDetailResponseDto__schema0,
);

export type EventListItemResponseDto = typeof EventListItemResponseDto.Type;

export const EventListItemResponseDto = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  world: Schema.String,
  active: Schema.Boolean,
  startsAt: Schema.Union([DateTimeString, Schema.Null]),
  endsAt: Schema.Union([DateTimeString, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  heroNpcs: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      npcId: Schema.Union([FiniteNumber, Schema.Null]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
    }),
  ),
}).annotate({ identifier: "EventListItemResponseDto" });

export type CreateEventDto = typeof CreateEventDto.Type;

export const CreateEventDto = Schema.Struct({
  name: Schema.String,
  world: Schema.String,
  startsAt: Schema.optionalKey(DateTimeString),
  endsAt: Schema.optionalKey(DateTimeString),
  basePointsPerKill: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  assignmentTimeoutMinutes: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  participationConfirmationMinutes: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  mapAssignmentCap: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  rulebookMarkdown: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(10000).annotate({
        expected: "a value with a length of at most 10000",
      }),
    ),
  ),
  scoringRules: Schema.optionalKey(
    Schema.Struct({
      version: FiniteNumber.check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      ).check(
        Schema.isLessThanOrEqualTo(1).annotate({
          expected: "a value less than or equal to 1",
        }),
      ),
      timezone: Schema.String,
      hardCapPoints: FiniteNumber.check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      ),
      minTrackingPercentForBonuses: Schema.optionalKey(
        FiniteNumber.check(
          Schema.isGreaterThanOrEqualTo(0).annotate({
            expected: "a value greater than or equal to 0",
          }),
        ).check(
          Schema.isLessThanOrEqualTo(100).annotate({
            expected: "a value less than or equal to 100",
          }),
        ),
      ),
      rules: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          name: Schema.optionalKey(Schema.String),
          enabled: Schema.optionalKey(Schema.Boolean),
          conditions: Schema.Array(
            Schema.Union(
              [
                Schema.Struct({
                  type: Schema.Literal("NUMERIC"),
                  factor: Schema.Literals([
                    "trackingDurationPercentage",
                    "trackingDurationSeconds",
                    "assignedMembersCount",
                    "minutesSinceLeaveToKill",
                    "timeOnMapSeconds",
                    "afkPercentage",
                    "respawnDurationSeconds",
                    "respawnProgressPercentage",
                  ]),
                  operator: Schema.Literals([">", ">=", "<", "<=", "==", "!="]),
                  value: FiniteNumber,
                }),
                Schema.Struct({
                  type: Schema.Literal("BOOLEAN"),
                  factor: Schema.Literals([
                    "eligible",
                    "memberPresentAtKill",
                    "wasPresent",
                  ]),
                  value: Schema.Boolean,
                }),
                Schema.Struct({
                  type: Schema.Literal("KILL_TIME_IN_WINDOW"),
                  from: Schema.String.check(
                    Schema.isPattern(
                      new RegExp("^([01]\\d|2[0-3]):([0-5]\\d)$"),
                    ).annotate({
                      expected:
                        "a string matching the RegExp ^([01]\\d|2[0-3]):([0-5]\\d)$",
                    }),
                  ),
                  to: Schema.String.check(
                    Schema.isPattern(
                      new RegExp("^([01]\\d|2[0-3]):([0-5]\\d)$"),
                    ).annotate({
                      expected:
                        "a string matching the RegExp ^([01]\\d|2[0-3]):([0-5]\\d)$",
                    }),
                  ),
                }),
                Schema.Struct({
                  type: Schema.Literal("RESPAWN_WINDOW_COVERAGE"),
                  from: Schema.String.check(
                    Schema.isPattern(
                      new RegExp("^([01]\\d|2[0-3]):([0-5]\\d)$"),
                    ).annotate({
                      expected:
                        "a string matching the RegExp ^([01]\\d|2[0-3]):([0-5]\\d)$",
                    }),
                  ),
                  to: Schema.String.check(
                    Schema.isPattern(
                      new RegExp("^([01]\\d|2[0-3]):([0-5]\\d)$"),
                    ).annotate({
                      expected:
                        "a string matching the RegExp ^([01]\\d|2[0-3]):([0-5]\\d)$",
                    }),
                  ),
                  operator: Schema.Literals([">", ">=", "<", "<=", "==", "!="]),
                  value: FiniteNumber,
                }),
              ],
              { mode: "oneOf" },
            ),
          ),
          action: Schema.Struct({
            type: Schema.Literals(["SET_BASE", "ADD_BONUS", "ZERO_BASE"]),
            points: Schema.optionalKey(
              FiniteNumber.check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              ),
            ),
          }),
        }),
      ),
    }),
  ),
  scoringMode: Schema.optionalKey(Schema.Literals(["SIMPLE", "ADVANCED"])),
  heroNpcs: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        npcId: Schema.optionalKey(
          Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
        ),
        npcName: Schema.String,
        maps: Schema.Array(
          Schema.Struct({
            mapId: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                  expected:
                    "a value greater than or equal to -9007199254740991",
                }),
              )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              ),
            mapName: Schema.String,
          }),
        ),
      }),
    ),
  ),
})
  .check(
    Schema.makeFilter((data) =>
      data.startsAt === undefined ||
      data.endsAt === undefined ||
      Date.parse(data.endsAt) >= Date.parse(data.startsAt)
        ? undefined
        : { path: ["endsAt"], issue: "endsAt must not be before startsAt" },
    ),
  )
  .annotate({ identifier: "CreateEventDto" });

export type EventMutationResponseDto = typeof EventMutationResponseDto.Type;

export const EventMutationResponseDto = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  world: Schema.String,
  active: Schema.Boolean,
  startsAt: Schema.Union([DateTimeString, Schema.Null]),
  endsAt: Schema.Union([DateTimeString, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  basePointsPerKill: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  assignmentTimeoutMinutes: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  participationConfirmationMinutes: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  mapAssignmentCap: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  rulebookMarkdown: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Null]),
  ),
  scoringMode: Schema.Literals(["SIMPLE", "ADVANCED"]),
  scoringRules: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(EventMutationResponseDto__schema0),
      Schema.Record(Schema.String, EventMutationResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  heroNpcs: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      npcId: Schema.Union([FiniteNumber, Schema.Null]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
      maps: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          mapId: FiniteNumber,
          mapName: Schema.String,
          locationId: Schema.Union([Schema.String, Schema.Null]),
          assignedMembers: Schema.Array(
            Schema.Struct({
              id: FiniteNumber,
              name: Schema.String,
              avatar: Schema.Union([Schema.String, Schema.Null]),
              userId: Schema.String,
              roles: Schema.Array(
                Schema.Struct({
                  position: FiniteNumber,
                  color: Schema.Union([FiniteNumber, Schema.Null]),
                }),
              ),
            }),
          ),
        }),
      ),
    }),
  ),
}).annotate({ identifier: "EventMutationResponseDto" });

export type EventOverviewResponseDto = typeof EventOverviewResponseDto.Type;

export const EventOverviewResponseDto = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  world: Schema.String,
  active: Schema.Boolean,
  startsAt: Schema.Union([DateTimeString, Schema.Null]),
  endsAt: Schema.Union([DateTimeString, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  basePointsPerKill: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  assignmentTimeoutMinutes: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  participationConfirmationMinutes: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  mapAssignmentCap: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  rulebookMarkdown: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Null]),
  ),
  scoringMode: Schema.Literals(["SIMPLE", "ADVANCED"]),
  scoringRules: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(EventOverviewResponseDto__schema0),
      Schema.Record(Schema.String, EventOverviewResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  heroNpcs: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      npcId: Schema.Union([FiniteNumber, Schema.Null]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
    }),
  ),
}).annotate({ identifier: "EventOverviewResponseDto" });

export type UpdateEventDto = typeof UpdateEventDto.Type;

export const UpdateEventDto = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
  startsAt: Schema.optionalKey(DateTimeString),
  endsAt: Schema.optionalKey(DateTimeString),
  heroNpcs: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        npcId: Schema.optionalKey(
          Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
        ),
        npcName: Schema.String,
        maps: Schema.Array(
          Schema.Struct({
            mapId: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                  expected:
                    "a value greater than or equal to -9007199254740991",
                }),
              )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              ),
            mapName: Schema.String,
          }),
        ),
      }),
    ),
  ),
  basePointsPerKill: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  assignmentTimeoutMinutes: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  participationConfirmationMinutes: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  mapAssignmentCap: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  rulebookMarkdown: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(10000).annotate({
        expected: "a value with a length of at most 10000",
      }),
    ),
  ),
  scoringRules: Schema.optionalKey(
    Schema.Struct({
      version: FiniteNumber.check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      ).check(
        Schema.isLessThanOrEqualTo(1).annotate({
          expected: "a value less than or equal to 1",
        }),
      ),
      timezone: Schema.String,
      hardCapPoints: FiniteNumber.check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      ),
      minTrackingPercentForBonuses: Schema.optionalKey(
        FiniteNumber.check(
          Schema.isGreaterThanOrEqualTo(0).annotate({
            expected: "a value greater than or equal to 0",
          }),
        ).check(
          Schema.isLessThanOrEqualTo(100).annotate({
            expected: "a value less than or equal to 100",
          }),
        ),
      ),
      rules: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          name: Schema.optionalKey(Schema.String),
          enabled: Schema.optionalKey(Schema.Boolean),
          conditions: Schema.Array(
            Schema.Union(
              [
                Schema.Struct({
                  type: Schema.Literal("NUMERIC"),
                  factor: Schema.Literals([
                    "trackingDurationPercentage",
                    "trackingDurationSeconds",
                    "assignedMembersCount",
                    "minutesSinceLeaveToKill",
                    "timeOnMapSeconds",
                    "afkPercentage",
                    "respawnDurationSeconds",
                    "respawnProgressPercentage",
                  ]),
                  operator: Schema.Literals([">", ">=", "<", "<=", "==", "!="]),
                  value: FiniteNumber,
                }),
                Schema.Struct({
                  type: Schema.Literal("BOOLEAN"),
                  factor: Schema.Literals([
                    "eligible",
                    "memberPresentAtKill",
                    "wasPresent",
                  ]),
                  value: Schema.Boolean,
                }),
                Schema.Struct({
                  type: Schema.Literal("KILL_TIME_IN_WINDOW"),
                  from: Schema.String.check(
                    Schema.isPattern(
                      new RegExp("^([01]\\d|2[0-3]):([0-5]\\d)$"),
                    ).annotate({
                      expected:
                        "a string matching the RegExp ^([01]\\d|2[0-3]):([0-5]\\d)$",
                    }),
                  ),
                  to: Schema.String.check(
                    Schema.isPattern(
                      new RegExp("^([01]\\d|2[0-3]):([0-5]\\d)$"),
                    ).annotate({
                      expected:
                        "a string matching the RegExp ^([01]\\d|2[0-3]):([0-5]\\d)$",
                    }),
                  ),
                }),
                Schema.Struct({
                  type: Schema.Literal("RESPAWN_WINDOW_COVERAGE"),
                  from: Schema.String.check(
                    Schema.isPattern(
                      new RegExp("^([01]\\d|2[0-3]):([0-5]\\d)$"),
                    ).annotate({
                      expected:
                        "a string matching the RegExp ^([01]\\d|2[0-3]):([0-5]\\d)$",
                    }),
                  ),
                  to: Schema.String.check(
                    Schema.isPattern(
                      new RegExp("^([01]\\d|2[0-3]):([0-5]\\d)$"),
                    ).annotate({
                      expected:
                        "a string matching the RegExp ^([01]\\d|2[0-3]):([0-5]\\d)$",
                    }),
                  ),
                  operator: Schema.Literals([">", ">=", "<", "<=", "==", "!="]),
                  value: FiniteNumber,
                }),
              ],
              { mode: "oneOf" },
            ),
          ),
          action: Schema.Struct({
            type: Schema.Literals(["SET_BASE", "ADD_BONUS", "ZERO_BASE"]),
            points: Schema.optionalKey(
              FiniteNumber.check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              ),
            ),
          }),
        }),
      ),
    }),
  ),
  scoringMode: Schema.optionalKey(Schema.Literals(["SIMPLE", "ADVANCED"])),
}).annotate({ identifier: "UpdateEventDto" });

export type EventWrappedApiResponseDto_Output =
  typeof EventWrappedApiResponseDto_Output.Type;

export const EventWrappedApiResponseDto_Output = Schema.Struct({
  generatedAt: DateTimeString,
  event: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    world: Schema.String,
    startsAt: Schema.Union([DateTimeString, Schema.Null]),
    endsAt: Schema.Union([DateTimeString, Schema.Null]),
    heroCount: FiniteNumber,
    mapCount: FiniteNumber,
    spawnCount: FiniteNumber,
  }),
  overview: Schema.Struct({
    totalKills: FiniteNumber,
    participantCount: FiniteNumber,
    totalPoints: FiniteNumber,
    totalTrackedSeconds: FiniteNumber,
    totalAfkSeconds: FiniteNumber,
    coveragePercentage: FiniteNumber,
    avgMapsPerSpawnWindow: FiniteNumber,
    busiestHour: Schema.Union([FiniteNumber, Schema.Null]),
    busiestHourKills: FiniteNumber,
    totalLoots: FiniteNumber,
    rarityTotals: Schema.Struct({
      unique: FiniteNumber,
      heroic: FiniteNumber,
      legendary: FiniteNumber,
    }),
  }),
  leaders: Schema.Struct({
    topHunter: Schema.Struct({
      winner: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            memberId: FiniteNumber,
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            primaryValue: FiniteNumber,
            secondaryValue: Schema.optionalKey(
              Schema.Union([FiniteNumber, Schema.Null]),
            ),
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
      candidateCount: FiniteNumber,
      tiedWinnerCount: FiniteNumber,
    }),
    topScorer: Schema.Struct({
      winner: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            memberId: FiniteNumber,
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            primaryValue: FiniteNumber,
            secondaryValue: Schema.optionalKey(
              Schema.Union([FiniteNumber, Schema.Null]),
            ),
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
      candidateCount: FiniteNumber,
      tiedWinnerCount: FiniteNumber,
    }),
    longestDuty: Schema.Struct({
      winner: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            memberId: FiniteNumber,
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            primaryValue: FiniteNumber,
            secondaryValue: Schema.optionalKey(
              Schema.Union([FiniteNumber, Schema.Null]),
            ),
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
      candidateCount: FiniteNumber,
      tiedWinnerCount: FiniteNumber,
    }),
    topAfk: Schema.Struct({
      winner: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            memberId: FiniteNumber,
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            primaryValue: FiniteNumber,
            secondaryValue: Schema.optionalKey(
              Schema.Union([FiniteNumber, Schema.Null]),
            ),
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
      candidateCount: FiniteNumber,
      tiedWinnerCount: FiniteNumber,
    }),
    mostFlexible: Schema.Struct({
      winner: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            memberId: FiniteNumber,
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            primaryValue: FiniteNumber,
            secondaryValue: Schema.optionalKey(
              Schema.Union([FiniteNumber, Schema.Null]),
            ),
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
      candidateCount: FiniteNumber,
      tiedWinnerCount: FiniteNumber,
    }),
    topEfficiency: Schema.Struct({
      winner: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            memberId: FiniteNumber,
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            primaryValue: FiniteNumber,
            secondaryValue: Schema.optionalKey(
              Schema.Union([FiniteNumber, Schema.Null]),
            ),
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
      candidateCount: FiniteNumber,
      tiedWinnerCount: FiniteNumber,
    }),
  }),
  coverage: Schema.Struct({
    totalWindowCount: FiniteNumber,
    totalWindowSeconds: FiniteNumber,
    totalCoverageSeconds: FiniteNumber,
    totalUncoveredSeconds: FiniteNumber,
    totalUnassignedSeconds: FiniteNumber,
    coveragePercentage: FiniteNumber,
    avgMapsPerSpawnWindow: FiniteNumber,
    bestHeroCoverage: Schema.Union([
      Schema.StructWithRest(
        Schema.Struct({
          heroNpcId: Schema.String,
          npcName: Schema.String,
          npcIcon: Schema.Union([Schema.String, Schema.Null]),
          mapCount: FiniteNumber,
          totalKills: FiniteNumber,
          coveragePercentage: FiniteNumber,
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
    roughestHeroCoverage: Schema.Union([
      Schema.StructWithRest(
        Schema.Struct({
          heroNpcId: Schema.String,
          npcName: Schema.String,
          npcIcon: Schema.Union([Schema.String, Schema.Null]),
          mapCount: FiniteNumber,
          totalKills: FiniteNumber,
          coveragePercentage: FiniteNumber,
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
  heroes: Schema.Array(
    Schema.Struct({
      heroNpcId: Schema.String,
      npcId: Schema.Union([FiniteNumber, Schema.Null]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      mapCount: FiniteNumber,
      totalKills: FiniteNumber,
      totalPoints: FiniteNumber,
      coveragePercentage: FiniteNumber,
      rarityTotals: Schema.Struct({
        unique: FiniteNumber,
        heroic: FiniteNumber,
        legendary: FiniteNumber,
      }),
      topHunter: Schema.Struct({
        winner: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              memberId: FiniteNumber,
              name: Schema.String,
              avatar: Schema.Union([Schema.String, Schema.Null]),
              primaryValue: FiniteNumber,
              secondaryValue: Schema.optionalKey(
                Schema.Union([FiniteNumber, Schema.Null]),
              ),
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
        candidateCount: FiniteNumber,
        tiedWinnerCount: FiniteNumber,
      }),
    }),
  ),
  loot: Schema.Struct({
    totalLoots: FiniteNumber,
    rarityTotals: Schema.Struct({
      unique: FiniteNumber,
      heroic: FiniteNumber,
      legendary: FiniteNumber,
    }),
    heroBreakdown: Schema.Array(
      Schema.Struct({
        heroNpcId: Schema.String,
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        totalLoots: FiniteNumber,
        rarityTotals: Schema.Struct({
          unique: FiniteNumber,
          heroic: FiniteNumber,
          legendary: FiniteNumber,
        }),
      }),
    ),
  }),
}).annotate({ identifier: "EventWrappedApiResponseDto_Output" });

export type EventMapsResponseDto_Output =
  typeof EventMapsResponseDto_Output.Type;

export const EventMapsResponseDto_Output = Schema.Struct({
  id: Schema.String,
  heroNpcs: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      npcId: Schema.Union([FiniteNumber, Schema.Null]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
      locations: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          name: Schema.String,
          order: FiniteNumber,
          maps: Schema.Array(
            Schema.Struct({
              id: Schema.String,
              mapId: FiniteNumber,
              mapName: Schema.String,
              locationId: Schema.Union([Schema.String, Schema.Null]),
              assignedMembers: Schema.Array(
                Schema.Struct({
                  id: FiniteNumber,
                  name: Schema.String,
                  avatar: Schema.Union([Schema.String, Schema.Null]),
                  userId: Schema.String,
                  roles: Schema.Array(
                    Schema.Struct({
                      position: FiniteNumber,
                      color: Schema.Union([FiniteNumber, Schema.Null]),
                    }),
                  ),
                }),
              ),
            }),
          ),
        }),
      ),
      maps: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          mapId: FiniteNumber,
          mapName: Schema.String,
          locationId: Schema.Union([Schema.String, Schema.Null]),
          assignedMembers: Schema.Array(
            Schema.Struct({
              id: FiniteNumber,
              name: Schema.String,
              avatar: Schema.Union([Schema.String, Schema.Null]),
              userId: Schema.String,
              roles: Schema.Array(
                Schema.Struct({
                  position: FiniteNumber,
                  color: Schema.Union([FiniteNumber, Schema.Null]),
                }),
              ),
            }),
          ),
        }),
      ),
    }),
  ),
}).annotate({ identifier: "EventMapsResponseDto_Output" });

export type AssignMemberDto = typeof AssignMemberDto.Type;

export const AssignMemberDto = Schema.Struct({
  memberId: Schema.Number.check(
    Schema.isInt().annotate({ expected: "an integer" }),
  )
    .check(
      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
        expected: "a value greater than or equal to -9007199254740991",
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    ),
}).annotate({ identifier: "AssignMemberDto" });

export type CreateHeroDto = typeof CreateHeroDto.Type;

export const CreateHeroDto = Schema.Struct({
  npcId: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  npcName: Schema.String,
  maps: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        mapId: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        mapName: Schema.String,
      }),
    ),
  ),
}).annotate({ identifier: "CreateHeroDto" });

export type UpdateHeroDto = typeof UpdateHeroDto.Type;

export const UpdateHeroDto = Schema.Struct({
  npcName: Schema.String,
  npcId: Schema.optionalKey(FiniteNumber),
}).annotate({ identifier: "UpdateHeroDto" });

export type CreateMapDto = typeof CreateMapDto.Type;

export const CreateMapDto = Schema.Struct({
  mapId: Schema.Number.check(
    Schema.isInt().annotate({ expected: "an integer" }),
  )
    .check(
      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
        expected: "a value greater than or equal to -9007199254740991",
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    ),
  mapName: Schema.String,
}).annotate({ identifier: "CreateMapDto" });

export type EventMapResponseDto_Output = typeof EventMapResponseDto_Output.Type;

export const EventMapResponseDto_Output = Schema.Struct({
  id: Schema.String,
  mapId: FiniteNumber,
  mapName: Schema.String,
  locationId: Schema.Union([Schema.String, Schema.Null]),
  assignedMembers: Schema.Array(
    Schema.Struct({
      id: FiniteNumber,
      name: Schema.String,
      avatar: Schema.Union([Schema.String, Schema.Null]),
      userId: Schema.String,
      roles: Schema.Array(
        Schema.Struct({
          position: FiniteNumber,
          color: Schema.Union([FiniteNumber, Schema.Null]),
        }),
      ),
    }),
  ),
}).annotate({ identifier: "EventMapResponseDto_Output" });

export type CreateLocationDto = typeof CreateLocationDto.Type;

export const CreateLocationDto = Schema.Struct({
  name: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
}).annotate({ identifier: "CreateLocationDto" });

export type UpdateLocationDto = typeof UpdateLocationDto.Type;

export const UpdateLocationDto = Schema.Struct({
  name: Schema.optionalKey(
    Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  ),
}).annotate({ identifier: "UpdateLocationDto" });

export type ReorderLocationsDto = typeof ReorderLocationsDto.Type;

export const ReorderLocationsDto = Schema.Struct({
  locationIds: Schema.Array(Schema.String),
}).annotate({ identifier: "ReorderLocationsDto" });

export type AssignMapLocationDto = typeof AssignMapLocationDto.Type;

export const AssignMapLocationDto = Schema.Struct({
  locationId: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
}).annotate({ identifier: "AssignMapLocationDto" });

export type PendingParticipationConfirmationsResponseDto =
  typeof PendingParticipationConfirmationsResponseDto.Type;

export const PendingParticipationConfirmationsResponseDto = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      killId: Schema.String,
      killedAt: DateTimeString,
      confirmationDeadlineAt: Schema.String.annotate({
        format: "date-time",
      }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      heroNpc: Schema.Struct({
        id: Schema.String,
        npcId: Schema.Union([FiniteNumber, Schema.Null]),
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
      }),
    }),
  ),
  expiredItems: Schema.Array(
    Schema.Struct({
      killId: Schema.String,
      killedAt: DateTimeString,
      confirmationDeadlineAt: Schema.String.annotate({
        format: "date-time",
      }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      heroNpc: Schema.Struct({
        id: Schema.String,
        npcId: Schema.Union([FiniteNumber, Schema.Null]),
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
      }),
    }),
  ),
}).annotate({ identifier: "PendingParticipationConfirmationsResponseDto" });

export type AcknowledgeExpiredParticipationConfirmationsDto =
  typeof AcknowledgeExpiredParticipationConfirmationsDto.Type;

export const AcknowledgeExpiredParticipationConfirmationsDto = Schema.Struct({
  killIds: Schema.Array(Schema.String).check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
}).annotate({ identifier: "AcknowledgeExpiredParticipationConfirmationsDto" });

export type AcknowledgeExpiredParticipationConfirmationsResponseDto_Output =
  typeof AcknowledgeExpiredParticipationConfirmationsResponseDto_Output.Type;

export const AcknowledgeExpiredParticipationConfirmationsResponseDto_Output =
  Schema.Struct({
    acknowledgedCount: Schema.Number.check(
      Schema.isInt().annotate({ expected: "an integer" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  }).annotate({
    identifier:
      "AcknowledgeExpiredParticipationConfirmationsResponseDto_Output",
  });

export type ConfirmParticipationForKillResponseDto_Output =
  typeof ConfirmParticipationForKillResponseDto_Output.Type;

export const ConfirmParticipationForKillResponseDto_Output = Schema.Struct({
  success: Schema.Boolean,
  confirmedNow: Schema.Boolean,
}).annotate({ identifier: "ConfirmParticipationForKillResponseDto_Output" });

export type EventRankingEntryResponseDto =
  typeof EventRankingEntryResponseDto.Type;

export const EventRankingEntryResponseDto = Schema.Struct({
  id: Schema.String,
  eventId: Schema.String,
  memberId: FiniteNumber,
  heroNpcName: Schema.String,
  totalPoints: FiniteNumber,
  totalKills: FiniteNumber,
  totalTimeSeconds: FiniteNumber,
  avgAfkPercentage: FiniteNumber,
  pointsModified: Schema.Boolean,
  updatedAt: DateTimeString,
  member: Schema.Struct({
    id: FiniteNumber,
    name: Schema.String,
    roles: Schema.Array(
      Schema.Struct({
        position: FiniteNumber,
        color: Schema.Union([FiniteNumber, Schema.Null]),
      }),
    ),
  }),
  editHistory: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      rankingId: Schema.String,
      previousPoints: FiniteNumber,
      newPoints: FiniteNumber,
      deltaPoints: FiniteNumber,
      editType: Schema.Literals(["KILL_POINT", "RANKING"]),
      editedByUserId: Schema.String,
      editedByName: Schema.Union([Schema.String, Schema.Null]),
      comment: Schema.Union([Schema.String, Schema.Null]),
      editedAt: DateTimeString,
    }),
  ),
}).annotate({ identifier: "EventRankingEntryResponseDto" });

export type UpdateRankingPointsDto = typeof UpdateRankingPointsDto.Type;

export const UpdateRankingPointsDto = Schema.Struct({
  pointsDelta: FiniteNumber,
  comment: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(500).annotate({
        expected: "a value with a length of at most 500",
      }),
    ),
  ),
}).annotate({ identifier: "UpdateRankingPointsDto" });

export type EventTimerResponseDto = typeof EventTimerResponseDto.Type;

export const EventTimerResponseDto = Schema.Struct({
  npcId: FiniteNumber,
  world: Schema.String,
  minSpawnTime: DateTimeString,
  maxSpawnTime: DateTimeString,
  npc: Schema.Struct({
    name: Schema.String,
    icon: Schema.Union([Schema.String, Schema.Null]),
  }),
}).annotate({ identifier: "EventTimerResponseDto" });

export type EventHeroStatsResponseDto = typeof EventHeroStatsResponseDto.Type;

export const EventHeroStatsResponseDto = Schema.Struct({
  heroId: Schema.String,
  npcId: Schema.Union([FiniteNumber, Schema.Null]),
  npcName: Schema.String,
  npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
  npcProf: Schema.Union([Schema.String, Schema.Null]),
  killCount: FiniteNumber,
}).annotate({ identifier: "EventHeroStatsResponseDto" });

export type EventKillHistoryResponseDto =
  typeof EventKillHistoryResponseDto.Type;

export const EventKillHistoryResponseDto = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      heroNpcId: Schema.String,
      killedAt: DateTimeString,
      minSpawnTimeAtKill: DateTimeString,
      maxSpawnTimeAtKill: DateTimeString,
      isManualClose: Schema.Boolean,
      heroNpc: Schema.Struct({
        id: Schema.String,
        npcId: Schema.Union([FiniteNumber, Schema.Null]),
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
      }),
      points: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          memberId: FiniteNumber,
          points: FiniteNumber,
          basePoints: FiniteNumber,
          manualAdjustmentPoints: Schema.optionalKey(
            Schema.Union([FiniteNumber, Schema.Null]),
          ),
          trackingDurationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
          trackingDurationPercentage: Schema.Union([FiniteNumber, Schema.Null]),
          timeOnMapSeconds: FiniteNumber,
          afkPercentage: FiniteNumber,
          wasPresent: Schema.Boolean,
          bonusBreakdown: Schema.optionalKey(
            Schema.Union([
              Schema.Union([
                Schema.String,
                FiniteNumber,
                Schema.Boolean,
                Schema.Array(EventKillHistoryResponseDto__schema0),
                Schema.Record(
                  Schema.String,
                  EventKillHistoryResponseDto__schema0,
                ),
              ]),
              Schema.Null,
            ]),
          ),
          member: Schema.Struct({
            id: FiniteNumber,
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            userId: Schema.String,
          }),
          mapData: Schema.optionalKey(
            Schema.Array(
              Schema.Struct({
                mapId: Schema.String,
                mapName: Schema.String,
                assignedAt: Schema.String.annotate({
                  format: "date-time",
                }).check(
                  Schema.isPattern(
                    new RegExp(
                      "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                    ),
                  ).annotate({
                    expected:
                      "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                  }),
                ),
                unassignedAt: Schema.Union([DateTimeString, Schema.Null]),
                assignmentDurationSeconds: FiniteNumber,
                presenceTimeSeconds: FiniteNumber,
                afkTimeSeconds: FiniteNumber,
              }),
            ),
          ),
        }),
      ),
    }),
  ),
  nextCursor: Schema.Union([Schema.String, Schema.Null]),
}).annotate({ identifier: "EventKillHistoryResponseDto" });

export type EventMemberKillHistoryResponseDto =
  typeof EventMemberKillHistoryResponseDto.Type;

export const EventMemberKillHistoryResponseDto = Schema.Struct({
  member: Schema.Struct({
    id: FiniteNumber,
    name: Schema.String,
    avatar: Schema.Union([Schema.String, Schema.Null]),
    userId: Schema.String,
  }),
  data: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      heroNpcId: Schema.String,
      killedAt: DateTimeString,
      minSpawnTimeAtKill: DateTimeString,
      maxSpawnTimeAtKill: DateTimeString,
      isManualClose: Schema.Boolean,
      heroNpc: Schema.Struct({
        id: Schema.String,
        npcId: Schema.Union([FiniteNumber, Schema.Null]),
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
      }),
      memberPoint: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            id: Schema.String,
            memberId: FiniteNumber,
            points: FiniteNumber,
            basePoints: FiniteNumber,
            manualAdjustmentPoints: Schema.optionalKey(
              Schema.Union([FiniteNumber, Schema.Null]),
            ),
            trackingDurationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
            trackingDurationPercentage: Schema.Union([
              FiniteNumber,
              Schema.Null,
            ]),
            timeOnMapSeconds: FiniteNumber,
            afkPercentage: FiniteNumber,
            wasPresent: Schema.Boolean,
            bonusBreakdown: Schema.optionalKey(
              Schema.Union([
                Schema.Union([
                  Schema.String,
                  FiniteNumber,
                  Schema.Boolean,
                  Schema.Array(EventMemberKillHistoryResponseDto__schema0),
                  Schema.Record(
                    Schema.String,
                    EventMemberKillHistoryResponseDto__schema0,
                  ),
                ]),
                Schema.Null,
              ]),
            ),
            member: Schema.Struct({
              id: FiniteNumber,
              name: Schema.String,
              avatar: Schema.Union([Schema.String, Schema.Null]),
              userId: Schema.String,
            }),
            mapData: Schema.optionalKey(
              Schema.Array(
                Schema.Struct({
                  mapId: Schema.String,
                  mapName: Schema.String,
                  assignedAt: Schema.String.annotate({
                    format: "date-time",
                  }).check(
                    Schema.isPattern(
                      new RegExp(
                        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                      ),
                    ).annotate({
                      expected:
                        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                    }),
                  ),
                  unassignedAt: Schema.Union([DateTimeString, Schema.Null]),
                  assignmentDurationSeconds: FiniteNumber,
                  presenceTimeSeconds: FiniteNumber,
                  afkTimeSeconds: FiniteNumber,
                }),
              ),
            ),
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
  ),
  nextCursor: Schema.Union([Schema.String, Schema.Null]),
}).annotate({ identifier: "EventMemberKillHistoryResponseDto" });

export type KillDetailResponseDto = typeof KillDetailResponseDto.Type;

export const KillDetailResponseDto = Schema.Struct({
  kill: Schema.Struct({
    id: Schema.String,
    heroNpcId: Schema.String,
    killedAt: DateTimeString,
    minSpawnTimeAtKill: DateTimeString,
    maxSpawnTimeAtKill: DateTimeString,
    timerCreatedById: Schema.Union([FiniteNumber, Schema.Null]),
    isManualClose: Schema.Boolean,
    respawnDurationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
    windowDurationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
    resolvedAfterMaxSpawnTimeMs: Schema.Union([FiniteNumber, Schema.Null]),
    heroNpc: Schema.Struct({
      id: Schema.String,
      npcId: Schema.Union([FiniteNumber, Schema.Null]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
      event: Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        world: Schema.String,
      }),
    }),
    timerCreatedBy: Schema.Union([
      Schema.StructWithRest(
        Schema.Struct({
          id: FiniteNumber,
          name: Schema.String,
          avatar: Schema.Union([Schema.String, Schema.Null]),
          userId: Schema.String,
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
    points: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        memberId: FiniteNumber,
        points: FiniteNumber,
        basePoints: FiniteNumber,
        manualAdjustmentPoints: Schema.optionalKey(
          Schema.Union([FiniteNumber, Schema.Null]),
        ),
        trackingDurationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
        trackingDurationPercentage: Schema.Union([FiniteNumber, Schema.Null]),
        timeOnMapSeconds: FiniteNumber,
        afkPercentage: FiniteNumber,
        wasPresent: Schema.Boolean,
        bonusBreakdown: Schema.optionalKey(
          Schema.Union([
            Schema.Union([
              Schema.String,
              FiniteNumber,
              Schema.Boolean,
              Schema.Array(KillDetailResponseDto__schema0),
              Schema.Record(Schema.String, KillDetailResponseDto__schema0),
            ]),
            Schema.Null,
          ]),
        ),
        member: Schema.Struct({
          id: FiniteNumber,
          name: Schema.String,
          avatar: Schema.Union([Schema.String, Schema.Null]),
          userId: Schema.String,
          roles: Schema.Array(
            Schema.Struct({
              position: Schema.Union([FiniteNumber, Schema.Null]),
              color: Schema.Union([FiniteNumber, Schema.Null]),
            }),
          ),
        }),
        mapData: Schema.optionalKey(
          Schema.Array(
            Schema.Struct({
              mapId: Schema.String,
              mapName: Schema.String,
              assignedAt: DateTimeString,
              unassignedAt: Schema.Union([DateTimeString, Schema.Null]),
              assignmentDurationSeconds: FiniteNumber,
              presenceTimeSeconds: FiniteNumber,
              afkTimeSeconds: FiniteNumber,
            }),
          ),
        ),
      }),
    ),
  }),
  eventConfig: Schema.Struct({
    scoringMode: Schema.Literals(["SIMPLE", "ADVANCED"]),
    scoringRules: Schema.Union([
      Schema.Union([
        Schema.String,
        FiniteNumber,
        Schema.Boolean,
        Schema.Array(KillDetailResponseDto__schema0),
        Schema.Record(Schema.String, KillDetailResponseDto__schema0),
      ]),
      Schema.Null,
    ]),
  }),
}).annotate({ identifier: "KillDetailResponseDto" });

export type UpdateKillPointDto = typeof UpdateKillPointDto.Type;

export const UpdateKillPointDto = Schema.Struct({
  pointsDelta: FiniteNumber,
  comment: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(500).annotate({
        expected: "a value with a length of at most 500",
      }),
    ),
  ),
}).annotate({ identifier: "UpdateKillPointDto" });

export type EventCoordinationResponseDto =
  typeof EventCoordinationResponseDto.Type;

export const EventCoordinationResponseDto = Schema.Struct({
  assignmentTimeoutMinutes: FiniteNumber,
  generatedAt: DateTimeString,
  eventId: Schema.String,
  world: Schema.String,
  summary: Schema.Struct({
    criticalCount: FiniteNumber,
    warningCount: FiniteNumber,
    coveredMaps: FiniteNumber,
    totalMaps: FiniteNumber,
    nextSpawnAt: Schema.Union([DateTimeString, Schema.Null]),
  }),
  heroes: Schema.Array(
    Schema.Struct({
      heroId: Schema.String,
      npcId: Schema.Union([FiniteNumber, Schema.Null]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
      timer: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            npcId: FiniteNumber,
            world: Schema.String,
            minSpawnTime: DateTimeString,
            maxSpawnTime: DateTimeString,
            status: Schema.Literals(["OPEN", "WAITING", "OVERDUE", "NONE"]),
            overdueMs: Schema.Union([FiniteNumber, Schema.Null]),
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
      coverage: Schema.Struct({
        totalMaps: FiniteNumber,
        assignedMaps: FiniteNumber,
        coveredMaps: FiniteNumber,
        unassignedMaps: FiniteNumber,
        uncoveredMaps: FiniteNumber,
        activeGapCount: FiniteNumber,
      }),
      activeGaps: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          mapId: Schema.String,
          numericMapId: FiniteNumber,
          mapName: Schema.String,
          gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
          startedAt: DateTimeString,
          durationSeconds: FiniteNumber,
        }),
      ),
      priority: Schema.Literals(["CRITICAL", "WARNING", "OK", "IDLE"]),
      recommendedAction: Schema.Literals([
        "CLOSE_WINDOW",
        "ASSIGN_MAPS",
        "JOIN_MAP",
        "WAIT",
        "NONE",
      ]),
    }),
  ),
}).annotate({ identifier: "EventCoordinationResponseDto" });

export type KillTimelineMapResponseDto = typeof KillTimelineMapResponseDto.Type;

export const KillTimelineMapResponseDto = Schema.Struct({
  mapId: Schema.String,
  mapName: Schema.String,
  numericMapId: FiniteNumber,
  assignments: Schema.Array(
    Schema.Struct({
      memberId: FiniteNumber,
      memberName: Schema.String,
      memberAvatar: Schema.Union([Schema.String, Schema.Null]),
      memberUserId: Schema.String,
      assignedAt: DateTimeString,
      unassignedAt: Schema.Union([DateTimeString, Schema.Null]),
    }),
  ),
  gaps: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
      startedAt: DateTimeString,
      endedAt: Schema.Union([DateTimeString, Schema.Null]),
      durationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
    }),
  ),
}).annotate({ identifier: "KillTimelineMapResponseDto" });

export type HeroCoverageGapResponseDto = typeof HeroCoverageGapResponseDto.Type;

export const HeroCoverageGapResponseDto = Schema.Struct({
  id: Schema.String,
  mapId: Schema.String,
  heroNpcId: Schema.String,
  gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
  startedAt: DateTimeString,
  endedAt: Schema.Union([DateTimeString, Schema.Null]),
  durationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
  map: Schema.Struct({
    mapName: Schema.String,
    mapId: FiniteNumber,
  }),
}).annotate({ identifier: "HeroCoverageGapResponseDto" });

export type CoverageGapResponseDto = typeof CoverageGapResponseDto.Type;

export const CoverageGapResponseDto = Schema.Struct({
  id: Schema.String,
  mapId: Schema.String,
  heroNpcId: Schema.String,
  gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
  startedAt: DateTimeString,
  endedAt: Schema.Union([DateTimeString, Schema.Null]),
  durationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
}).annotate({ identifier: "CoverageGapResponseDto" });

export type NullableCoverageGapResponseDto =
  typeof NullableCoverageGapResponseDto.Type;

export const NullableCoverageGapResponseDto = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      id: Schema.String,
      mapId: Schema.String,
      heroNpcId: Schema.String,
      gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
      startedAt: DateTimeString,
      endedAt: Schema.Union([DateTimeString, Schema.Null]),
      durationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
    }),
    [
      Schema.Record(
        Schema.String,
        Schema.Json.annotate({ expected: "JSON value" }),
      ),
    ],
  ),
  Schema.Null,
]).annotate({ identifier: "NullableCoverageGapResponseDto" });

export type HeroPresenceStatsResponseDto =
  typeof HeroPresenceStatsResponseDto.Type;

export const HeroPresenceStatsResponseDto = Schema.Struct({
  totalCoverageSeconds: FiniteNumber,
  totalEventSeconds: FiniteNumber,
  presencePercentage: FiniteNumber,
  memberStats: Schema.Array(
    Schema.Struct({
      memberId: FiniteNumber,
      memberName: Schema.String,
      memberAvatar: Schema.Union([Schema.String, Schema.Null]),
      totalTimeSeconds: FiniteNumber,
      afkTimeSeconds: FiniteNumber,
      afkPercentage: FiniteNumber,
    }),
  ),
}).annotate({ identifier: "HeroPresenceStatsResponseDto" });

export type HeroRespawnConfigResponseDto =
  typeof HeroRespawnConfigResponseDto.Type;

export const HeroRespawnConfigResponseDto = Schema.Struct({
  hasTimer: Schema.Boolean,
  windowStatus: Schema.Literals(["OPEN", "WAITING", "OVERDUE", "NONE"]),
  minSpawnTime: Schema.Union([DateTimeString, Schema.Null]),
  maxSpawnTime: Schema.Union([DateTimeString, Schema.Null]),
  overdueMs: Schema.Union([FiniteNumber, Schema.Null]),
}).annotate({ identifier: "HeroRespawnConfigResponseDto" });

export type CloseRespawnWindowDto = typeof CloseRespawnWindowDto.Type;

export const CloseRespawnWindowDto = Schema.Struct({
  createNewWindow: Schema.optionalKey(Schema.Boolean),
  newMinSpawnTime: Schema.optionalKey(DateTimeString),
  newMaxSpawnTime: Schema.optionalKey(DateTimeString),
})
  .check(
    Schema.makeFilter((data) =>
      !data.createNewWindow ||
      (data.newMinSpawnTime !== undefined && data.newMaxSpawnTime !== undefined)
        ? undefined
        : "newMinSpawnTime and newMaxSpawnTime are required when createNewWindow is true",
    ),
  )
  .annotate({ identifier: "CloseRespawnWindowDto" });

export type OpenRespawnWindowDto = typeof OpenRespawnWindowDto.Type;

export const OpenRespawnWindowDto = Schema.Struct({
  minSpawnTime: Schema.String.annotate({ format: "date-time" })
    .check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    )
    .check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
  maxSpawnTime: Schema.String.annotate({ format: "date-time" })
    .check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    )
    .check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
})
  .check(
    Schema.makeFilter((data) =>
      Date.parse(data.maxSpawnTime) >= Date.parse(data.minSpawnTime)
        ? undefined
        : {
            path: ["maxSpawnTime"],
            issue: "maxSpawnTime must not be before minSpawnTime",
          },
    ),
  )
  .annotate({ identifier: "OpenRespawnWindowDto" });

export type PinnedEventResponseDto = typeof PinnedEventResponseDto.Type;

export const PinnedEventResponseDto = Schema.Struct({
  pinnedAt: DateTimeString,
  event: Schema.Struct({
    id: Schema.String,
    guildId: Schema.String,
    name: Schema.String,
    world: Schema.String,
    active: Schema.Boolean,
    startsAt: Schema.Union([DateTimeString, Schema.Null]),
    endsAt: Schema.Union([DateTimeString, Schema.Null]),
    createdAt: DateTimeString,
    updatedAt: DateTimeString,
    heroNpcs: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        npcId: Schema.Union([FiniteNumber, Schema.Null]),
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
      }),
    ),
  }),
}).annotate({ identifier: "PinnedEventResponseDto" });

const __recursive_EventMutationResponseDto__schema0 = Schema.Union([
  Schema.Union([
    Schema.String,
    FiniteNumber,
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<EventMutationResponseDto__schema0> =>
                EventMutationResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<EventMutationResponseDto__schema0> =>
                EventMutationResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
    Schema.Record(
      Schema.String,
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<EventMutationResponseDto__schema0> =>
                EventMutationResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<EventMutationResponseDto__schema0> =>
                EventMutationResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "EventMutationResponseDto__schema0" });

const __recursive_EventOverviewResponseDto__schema0 = Schema.Union([
  Schema.Union([
    Schema.String,
    FiniteNumber,
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<EventOverviewResponseDto__schema0> =>
                EventOverviewResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<EventOverviewResponseDto__schema0> =>
                EventOverviewResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
    Schema.Record(
      Schema.String,
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<EventOverviewResponseDto__schema0> =>
                EventOverviewResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<EventOverviewResponseDto__schema0> =>
                EventOverviewResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "EventOverviewResponseDto__schema0" });

const __recursive_EventKillHistoryResponseDto__schema0 = Schema.Union([
  Schema.Union([
    Schema.String,
    FiniteNumber,
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<EventKillHistoryResponseDto__schema0> =>
                EventKillHistoryResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<EventKillHistoryResponseDto__schema0> =>
                EventKillHistoryResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
    Schema.Record(
      Schema.String,
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<EventKillHistoryResponseDto__schema0> =>
                EventKillHistoryResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<EventKillHistoryResponseDto__schema0> =>
                EventKillHistoryResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "EventKillHistoryResponseDto__schema0" });

const __recursive_EventMemberKillHistoryResponseDto__schema0 = Schema.Union([
  Schema.Union([
    Schema.String,
    FiniteNumber,
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<EventMemberKillHistoryResponseDto__schema0> =>
                EventMemberKillHistoryResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<EventMemberKillHistoryResponseDto__schema0> =>
                EventMemberKillHistoryResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
    Schema.Record(
      Schema.String,
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<EventMemberKillHistoryResponseDto__schema0> =>
                EventMemberKillHistoryResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<EventMemberKillHistoryResponseDto__schema0> =>
                EventMemberKillHistoryResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "EventMemberKillHistoryResponseDto__schema0" });

const __recursive_KillDetailResponseDto__schema0 = Schema.Union([
  Schema.Union([
    Schema.String,
    FiniteNumber,
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<KillDetailResponseDto__schema0> =>
                KillDetailResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<KillDetailResponseDto__schema0> =>
                KillDetailResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
    Schema.Record(
      Schema.String,
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<KillDetailResponseDto__schema0> =>
                KillDetailResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<KillDetailResponseDto__schema0> =>
                KillDetailResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "KillDetailResponseDto__schema0" });

export type ListEventsPathParams = typeof ListEventsPathParams.Type;

export const ListEventsPathParams = Schema.Struct({ guildId: Schema.String });

export type ListEventsQuery = typeof ListEventsQuery.Type;

export const ListEventsQuery = Schema.Struct({
  world: Schema.optionalKey(Schema.String),
  activeOnly: Schema.optionalKey(Schema.String),
});

export type ListEvents200 = typeof ListEvents200.Type;

export const ListEvents200 = Schema.Array(EventListItemResponseDto);

export type CreateEventPathParams = typeof CreateEventPathParams.Type;

export const CreateEventPathParams = Schema.Struct({ guildId: Schema.String });

export type CreateEventRequestJson = typeof CreateEventRequestJson.Type;

export const CreateEventRequestJson = CreateEventDto;

export type CreateEvent201 = typeof CreateEvent201.Type;

export const CreateEvent201 = EventMutationResponseDto;

export type ShowEventPathParams = typeof ShowEventPathParams.Type;

export const ShowEventPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ShowEvent200 = typeof ShowEvent200.Type;

export const ShowEvent200 = EventOverviewResponseDto;

export type DeleteEventPathParams = typeof DeleteEventPathParams.Type;

export const DeleteEventPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type DeleteEvent200 = typeof DeleteEvent200.Type;

export const DeleteEvent200 = SuccessResponseDto_Output;

export type UpdateEventPathParams = typeof UpdateEventPathParams.Type;

export const UpdateEventPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type UpdateEventRequestJson = typeof UpdateEventRequestJson.Type;

export const UpdateEventRequestJson = UpdateEventDto;

export type UpdateEvent200 = typeof UpdateEvent200.Type;

export const UpdateEvent200 = EventMutationResponseDto;

export type ShowEventOverviewPathParams =
  typeof ShowEventOverviewPathParams.Type;

export const ShowEventOverviewPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ShowEventOverview200 = typeof ShowEventOverview200.Type;

export const ShowEventOverview200 = EventOverviewResponseDto;

export type ShowEventWrappedPathParams = typeof ShowEventWrappedPathParams.Type;

export const ShowEventWrappedPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ShowEventWrapped200 = typeof ShowEventWrapped200.Type;

export const ShowEventWrapped200 = EventWrappedApiResponseDto_Output;

export type ListEventMapsPathParams = typeof ListEventMapsPathParams.Type;

export const ListEventMapsPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ListEventMaps200 = typeof ListEventMaps200.Type;

export const ListEventMaps200 = EventMapsResponseDto_Output;

export type RecalculateEventPointsPathParams =
  typeof RecalculateEventPointsPathParams.Type;

export const RecalculateEventPointsPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type RecalculateEventPoints200 = typeof RecalculateEventPoints200.Type;

export const RecalculateEventPoints200 = SuccessResponseDto_Output;

export type EventsAssignmentControllerAssignMemberPathParams =
  typeof EventsAssignmentControllerAssignMemberPathParams.Type;

export const EventsAssignmentControllerAssignMemberPathParams = Schema.Struct({
  eventId: Schema.String,
  mapId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerAssignMemberRequestJson =
  typeof EventsAssignmentControllerAssignMemberRequestJson.Type;

export const EventsAssignmentControllerAssignMemberRequestJson =
  AssignMemberDto;

export type EventsAssignmentControllerUnassignMemberPathParams =
  typeof EventsAssignmentControllerUnassignMemberPathParams.Type;

export const EventsAssignmentControllerUnassignMemberPathParams = Schema.Struct(
  { eventId: Schema.String, mapId: Schema.String, guildId: Schema.String },
);

export type EventsAssignmentControllerUnassignMemberQuery =
  typeof EventsAssignmentControllerUnassignMemberQuery.Type;

export const EventsAssignmentControllerUnassignMemberQuery = Schema.Struct({
  memberId: Schema.optionalKey(Schema.String),
});

export type EventsAssignmentControllerSelfAssignMemberPathParams =
  typeof EventsAssignmentControllerSelfAssignMemberPathParams.Type;

export const EventsAssignmentControllerSelfAssignMemberPathParams =
  Schema.Struct({
    eventId: Schema.String,
    mapId: Schema.String,
    guildId: Schema.String,
  });

export type EventsAssignmentControllerSelfUnassignMemberPathParams =
  typeof EventsAssignmentControllerSelfUnassignMemberPathParams.Type;

export const EventsAssignmentControllerSelfUnassignMemberPathParams =
  Schema.Struct({
    eventId: Schema.String,
    mapId: Schema.String,
    guildId: Schema.String,
  });

export type EventsAssignmentControllerAddHeroPathParams =
  typeof EventsAssignmentControllerAddHeroPathParams.Type;

export const EventsAssignmentControllerAddHeroPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerAddHeroRequestJson =
  typeof EventsAssignmentControllerAddHeroRequestJson.Type;

export const EventsAssignmentControllerAddHeroRequestJson = CreateHeroDto;

export type EventsAssignmentControllerDeleteHeroPathParams =
  typeof EventsAssignmentControllerDeleteHeroPathParams.Type;

export const EventsAssignmentControllerDeleteHeroPathParams = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerUpdateHeroPathParams =
  typeof EventsAssignmentControllerUpdateHeroPathParams.Type;

export const EventsAssignmentControllerUpdateHeroPathParams = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerUpdateHeroRequestJson =
  typeof EventsAssignmentControllerUpdateHeroRequestJson.Type;

export const EventsAssignmentControllerUpdateHeroRequestJson = UpdateHeroDto;

export type EventsAssignmentControllerAddMapPathParams =
  typeof EventsAssignmentControllerAddMapPathParams.Type;

export const EventsAssignmentControllerAddMapPathParams = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerAddMapRequestJson =
  typeof EventsAssignmentControllerAddMapRequestJson.Type;

export const EventsAssignmentControllerAddMapRequestJson = CreateMapDto;

export type EventsAssignmentControllerAddMap201 =
  typeof EventsAssignmentControllerAddMap201.Type;

export const EventsAssignmentControllerAddMap201 = EventMapResponseDto_Output;

export type EventsAssignmentControllerDeleteMapPathParams =
  typeof EventsAssignmentControllerDeleteMapPathParams.Type;

export const EventsAssignmentControllerDeleteMapPathParams = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  mapId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerGetLocationsPathParams =
  typeof EventsAssignmentControllerGetLocationsPathParams.Type;

export const EventsAssignmentControllerGetLocationsPathParams = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerCreateLocationPathParams =
  typeof EventsAssignmentControllerCreateLocationPathParams.Type;

export const EventsAssignmentControllerCreateLocationPathParams = Schema.Struct(
  { eventId: Schema.String, heroId: Schema.String, guildId: Schema.String },
);

export type EventsAssignmentControllerCreateLocationRequestJson =
  typeof EventsAssignmentControllerCreateLocationRequestJson.Type;

export const EventsAssignmentControllerCreateLocationRequestJson =
  CreateLocationDto;

export type EventsAssignmentControllerDeleteLocationPathParams =
  typeof EventsAssignmentControllerDeleteLocationPathParams.Type;

export const EventsAssignmentControllerDeleteLocationPathParams = Schema.Struct(
  {
    eventId: Schema.String,
    heroId: Schema.String,
    locationId: Schema.String,
    guildId: Schema.String,
  },
);

export type EventsAssignmentControllerUpdateLocationPathParams =
  typeof EventsAssignmentControllerUpdateLocationPathParams.Type;

export const EventsAssignmentControllerUpdateLocationPathParams = Schema.Struct(
  {
    eventId: Schema.String,
    heroId: Schema.String,
    locationId: Schema.String,
    guildId: Schema.String,
  },
);

export type EventsAssignmentControllerUpdateLocationRequestJson =
  typeof EventsAssignmentControllerUpdateLocationRequestJson.Type;

export const EventsAssignmentControllerUpdateLocationRequestJson =
  UpdateLocationDto;

export type EventsAssignmentControllerReorderLocationsPathParams =
  typeof EventsAssignmentControllerReorderLocationsPathParams.Type;

export const EventsAssignmentControllerReorderLocationsPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsAssignmentControllerReorderLocationsRequestJson =
  typeof EventsAssignmentControllerReorderLocationsRequestJson.Type;

export const EventsAssignmentControllerReorderLocationsRequestJson =
  ReorderLocationsDto;

export type EventsAssignmentControllerAssignMapToLocationPathParams =
  typeof EventsAssignmentControllerAssignMapToLocationPathParams.Type;

export const EventsAssignmentControllerAssignMapToLocationPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    mapId: Schema.String,
    guildId: Schema.String,
  });

export type EventsAssignmentControllerAssignMapToLocationRequestJson =
  typeof EventsAssignmentControllerAssignMapToLocationRequestJson.Type;

export const EventsAssignmentControllerAssignMapToLocationRequestJson =
  AssignMapLocationDto;

export type ListPendingParticipationConfirmationsPathParams =
  typeof ListPendingParticipationConfirmationsPathParams.Type;

export const ListPendingParticipationConfirmationsPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ListPendingParticipationConfirmations200 =
  typeof ListPendingParticipationConfirmations200.Type;

export const ListPendingParticipationConfirmations200 =
  PendingParticipationConfirmationsResponseDto;

export type AcknowledgeExpiredParticipationConfirmationsPathParams =
  typeof AcknowledgeExpiredParticipationConfirmationsPathParams.Type;

export const AcknowledgeExpiredParticipationConfirmationsPathParams =
  Schema.Struct({ eventId: Schema.String, guildId: Schema.String });

export type AcknowledgeExpiredParticipationConfirmationsRequestJson =
  typeof AcknowledgeExpiredParticipationConfirmationsRequestJson.Type;

export const AcknowledgeExpiredParticipationConfirmationsRequestJson =
  AcknowledgeExpiredParticipationConfirmationsDto;

export type AcknowledgeExpiredParticipationConfirmations201 =
  typeof AcknowledgeExpiredParticipationConfirmations201.Type;

export const AcknowledgeExpiredParticipationConfirmations201 =
  AcknowledgeExpiredParticipationConfirmationsResponseDto_Output;

export type ConfirmParticipationForKillPathParams =
  typeof ConfirmParticipationForKillPathParams.Type;

export const ConfirmParticipationForKillPathParams = Schema.Struct({
  eventId: Schema.String,
  killId: Schema.String,
  guildId: Schema.String,
});

export type ConfirmParticipationForKill200 =
  typeof ConfirmParticipationForKill200.Type;

export const ConfirmParticipationForKill200 =
  ConfirmParticipationForKillResponseDto_Output;

export type ListEventRankingPathParams = typeof ListEventRankingPathParams.Type;

export const ListEventRankingPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ListEventRanking200 = typeof ListEventRanking200.Type;

export const ListEventRanking200 = Schema.Array(EventRankingEntryResponseDto);

export type UpdateRankingPointsPathParams =
  typeof UpdateRankingPointsPathParams.Type;

export const UpdateRankingPointsPathParams = Schema.Struct({
  eventId: Schema.String,
  rankingId: Schema.String,
  guildId: Schema.String,
});

export type UpdateRankingPointsRequestJson =
  typeof UpdateRankingPointsRequestJson.Type;

export const UpdateRankingPointsRequestJson = UpdateRankingPointsDto;

export type ListEventHeroTimersPathParams =
  typeof ListEventHeroTimersPathParams.Type;

export const ListEventHeroTimersPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ListEventHeroTimersQuery = typeof ListEventHeroTimersQuery.Type;

export const ListEventHeroTimersQuery = Schema.Struct({ world: Schema.String });

export type ListEventHeroTimers200 = typeof ListEventHeroTimers200.Type;

export const ListEventHeroTimers200 = Schema.Array(EventTimerResponseDto);

export type EventsRankingControllerGetEventHeroStatsPathParams =
  typeof EventsRankingControllerGetEventHeroStatsPathParams.Type;

export const EventsRankingControllerGetEventHeroStatsPathParams = Schema.Struct(
  { eventId: Schema.String, guildId: Schema.String },
);

export type EventsRankingControllerGetEventHeroStats200 =
  typeof EventsRankingControllerGetEventHeroStats200.Type;

export const EventsRankingControllerGetEventHeroStats200 = Schema.Array(
  EventHeroStatsResponseDto,
);

export type EventsRankingControllerGetEventKillHistoryPathParams =
  typeof EventsRankingControllerGetEventKillHistoryPathParams.Type;

export const EventsRankingControllerGetEventKillHistoryPathParams =
  Schema.Struct({ eventId: Schema.String, guildId: Schema.String });

export type EventsRankingControllerGetEventKillHistoryQuery =
  typeof EventsRankingControllerGetEventKillHistoryQuery.Type;

export const EventsRankingControllerGetEventKillHistoryQuery = Schema.Struct({
  limit: Schema.optionalKey(Schema.String),
  cursor: Schema.optionalKey(Schema.String),
  heroId: Schema.optionalKey(Schema.String),
});

export type EventsRankingControllerGetEventKillHistory200 =
  typeof EventsRankingControllerGetEventKillHistory200.Type;

export const EventsRankingControllerGetEventKillHistory200 =
  EventKillHistoryResponseDto;

export type EventsRankingControllerGetMemberKillHistoryPathParams =
  typeof EventsRankingControllerGetMemberKillHistoryPathParams.Type;

export const EventsRankingControllerGetMemberKillHistoryPathParams =
  Schema.Struct({
    eventId: Schema.String,
    memberId: Schema.String,
    guildId: Schema.String,
  });

export type EventsRankingControllerGetMemberKillHistoryQuery =
  typeof EventsRankingControllerGetMemberKillHistoryQuery.Type;

export const EventsRankingControllerGetMemberKillHistoryQuery = Schema.Struct({
  limit: Schema.optionalKey(Schema.String),
  cursor: Schema.optionalKey(Schema.String),
  heroId: Schema.optionalKey(Schema.String),
});

export type EventsRankingControllerGetMemberKillHistory200 =
  typeof EventsRankingControllerGetMemberKillHistory200.Type;

export const EventsRankingControllerGetMemberKillHistory200 =
  EventMemberKillHistoryResponseDto;

export type EventsRankingControllerGetHeroKillHistoryPathParams =
  typeof EventsRankingControllerGetHeroKillHistoryPathParams.Type;

export const EventsRankingControllerGetHeroKillHistoryPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsRankingControllerGetHeroKillHistoryQuery =
  typeof EventsRankingControllerGetHeroKillHistoryQuery.Type;

export const EventsRankingControllerGetHeroKillHistoryQuery = Schema.Struct({
  limit: Schema.optionalKey(Schema.String),
  cursor: Schema.optionalKey(Schema.String),
});

export type EventsRankingControllerGetHeroKillHistory200 =
  typeof EventsRankingControllerGetHeroKillHistory200.Type;

export const EventsRankingControllerGetHeroKillHistory200 =
  EventKillHistoryResponseDto;

export type EventsRankingControllerGetKillDetailPathParams =
  typeof EventsRankingControllerGetKillDetailPathParams.Type;

export const EventsRankingControllerGetKillDetailPathParams = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  killId: Schema.String,
  guildId: Schema.String,
});

export type EventsRankingControllerGetKillDetail200 =
  typeof EventsRankingControllerGetKillDetail200.Type;

export const EventsRankingControllerGetKillDetail200 = KillDetailResponseDto;

export type EventsRankingControllerUpdateKillPointPathParams =
  typeof EventsRankingControllerUpdateKillPointPathParams.Type;

export const EventsRankingControllerUpdateKillPointPathParams = Schema.Struct({
  eventId: Schema.String,
  killId: Schema.String,
  killPointId: Schema.String,
  guildId: Schema.String,
});

export type EventsRankingControllerUpdateKillPointRequestJson =
  typeof EventsRankingControllerUpdateKillPointRequestJson.Type;

export const EventsRankingControllerUpdateKillPointRequestJson =
  UpdateKillPointDto;

export type EventsMonitoringControllerGetCoordinationPathParams =
  typeof EventsMonitoringControllerGetCoordinationPathParams.Type;

export const EventsMonitoringControllerGetCoordinationPathParams =
  Schema.Struct({ eventId: Schema.String, guildId: Schema.String });

export type EventsMonitoringControllerGetCoordination200 =
  typeof EventsMonitoringControllerGetCoordination200.Type;

export const EventsMonitoringControllerGetCoordination200 =
  EventCoordinationResponseDto;

export type EventsMonitoringControllerGetKillTimelineDataPathParams =
  typeof EventsMonitoringControllerGetKillTimelineDataPathParams.Type;

export const EventsMonitoringControllerGetKillTimelineDataPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    killId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetKillTimelineData200 =
  typeof EventsMonitoringControllerGetKillTimelineData200.Type;

export const EventsMonitoringControllerGetKillTimelineData200 = Schema.Array(
  KillTimelineMapResponseDto,
);

export type EventsMonitoringControllerGetHeroCoverageGapsPathParams =
  typeof EventsMonitoringControllerGetHeroCoverageGapsPathParams.Type;

export const EventsMonitoringControllerGetHeroCoverageGapsPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetHeroCoverageGaps200 =
  typeof EventsMonitoringControllerGetHeroCoverageGaps200.Type;

export const EventsMonitoringControllerGetHeroCoverageGaps200 = Schema.Array(
  HeroCoverageGapResponseDto,
);

export type EventsMonitoringControllerGetMapCoverageGapsPathParams =
  typeof EventsMonitoringControllerGetMapCoverageGapsPathParams.Type;

export const EventsMonitoringControllerGetMapCoverageGapsPathParams =
  Schema.Struct({
    eventId: Schema.String,
    mapId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetMapCoverageGaps200 =
  typeof EventsMonitoringControllerGetMapCoverageGaps200.Type;

export const EventsMonitoringControllerGetMapCoverageGaps200 = Schema.Array(
  CoverageGapResponseDto,
);

export type EventsMonitoringControllerGetActiveGapForMapPathParams =
  typeof EventsMonitoringControllerGetActiveGapForMapPathParams.Type;

export const EventsMonitoringControllerGetActiveGapForMapPathParams =
  Schema.Struct({
    eventId: Schema.String,
    mapId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetActiveGapForMap200 =
  typeof EventsMonitoringControllerGetActiveGapForMap200.Type;

export const EventsMonitoringControllerGetActiveGapForMap200 =
  NullableCoverageGapResponseDto;

export type EventsMonitoringControllerGetActiveGapsForHeroPathParams =
  typeof EventsMonitoringControllerGetActiveGapsForHeroPathParams.Type;

export const EventsMonitoringControllerGetActiveGapsForHeroPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetActiveGapsForHero200 =
  typeof EventsMonitoringControllerGetActiveGapsForHero200.Type;

export const EventsMonitoringControllerGetActiveGapsForHero200 = Schema.Array(
  CoverageGapResponseDto,
);

export type EventsMonitoringControllerGetHeroPresenceStatsPathParams =
  typeof EventsMonitoringControllerGetHeroPresenceStatsPathParams.Type;

export const EventsMonitoringControllerGetHeroPresenceStatsPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetHeroPresenceStats200 =
  typeof EventsMonitoringControllerGetHeroPresenceStats200.Type;

export const EventsMonitoringControllerGetHeroPresenceStats200 =
  HeroPresenceStatsResponseDto;

export type EventsMonitoringControllerGetHeroRespawnConfigPathParams =
  typeof EventsMonitoringControllerGetHeroRespawnConfigPathParams.Type;

export const EventsMonitoringControllerGetHeroRespawnConfigPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetHeroRespawnConfig200 =
  typeof EventsMonitoringControllerGetHeroRespawnConfig200.Type;

export const EventsMonitoringControllerGetHeroRespawnConfig200 =
  HeroRespawnConfigResponseDto;

export type EventsMonitoringControllerCloseRespawnWindowPathParams =
  typeof EventsMonitoringControllerCloseRespawnWindowPathParams.Type;

export const EventsMonitoringControllerCloseRespawnWindowPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerCloseRespawnWindowRequestJson =
  typeof EventsMonitoringControllerCloseRespawnWindowRequestJson.Type;

export const EventsMonitoringControllerCloseRespawnWindowRequestJson =
  CloseRespawnWindowDto;

export type EventsMonitoringControllerOpenRespawnWindowPathParams =
  typeof EventsMonitoringControllerOpenRespawnWindowPathParams.Type;

export const EventsMonitoringControllerOpenRespawnWindowPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerOpenRespawnWindowRequestJson =
  typeof EventsMonitoringControllerOpenRespawnWindowRequestJson.Type;

export const EventsMonitoringControllerOpenRespawnWindowRequestJson =
  OpenRespawnWindowDto;

export type ListPinnedEventsPathParams = typeof ListPinnedEventsPathParams.Type;

export const ListPinnedEventsPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ListPinnedEvents200 = typeof ListPinnedEvents200.Type;

export const ListPinnedEvents200 = Schema.Array(PinnedEventResponseDto);

export type PinEventPathParams = typeof PinEventPathParams.Type;

export const PinEventPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type PinEvent200 = typeof PinEvent200.Type;

export const PinEvent200 = PinnedEventResponseDto;

export type UnpinEventPathParams = typeof UnpinEventPathParams.Type;

export const UnpinEventPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});
