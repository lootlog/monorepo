/** Transport schemas owned by the events HTTP module. */
import * as Schema from "effect/Schema";
import { SuccessResponseDto_Output } from "../shared.js";

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

export type EventListItemResponseDto = {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly world: string;
  readonly active: boolean;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly heroNpcs: ReadonlyArray<{
    readonly id: string;
    readonly npcId: number | null;
    readonly npcName: string;
    readonly npcIcon: string | null;
    readonly npcLvl: number | null;
  }>;
};

export const EventListItemResponseDto = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  world: Schema.String,
  active: Schema.Boolean,
  startsAt: Schema.Union([
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
    Schema.Null,
  ]),
  endsAt: Schema.Union([
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
    Schema.Null,
  ]),
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
  heroNpcs: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      npcId: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
    }),
  ),
}).annotate({ identifier: "EventListItemResponseDto" });

export type CreateEventDto = {
  readonly name: string;
  readonly world: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly basePointsPerKill?: number;
  readonly assignmentTimeoutMinutes?: number;
  readonly participationConfirmationMinutes?: number;
  readonly mapAssignmentCap?: number;
  readonly rulebookMarkdown?: string;
  readonly scoringRules?: {
    readonly version: number;
    readonly timezone: string;
    readonly hardCapPoints: number;
    readonly minTrackingPercentForBonuses?: number;
    readonly rules: ReadonlyArray<{
      readonly id: string;
      readonly name?: string;
      readonly enabled?: boolean;
      readonly conditions: ReadonlyArray<
        | {
            readonly type: "NUMERIC";
            readonly factor:
              | "trackingDurationPercentage"
              | "trackingDurationSeconds"
              | "assignedMembersCount"
              | "minutesSinceLeaveToKill"
              | "timeOnMapSeconds"
              | "afkPercentage"
              | "respawnDurationSeconds"
              | "respawnProgressPercentage";
            readonly operator: ">" | ">=" | "<" | "<=" | "==" | "!=";
            readonly value: number;
          }
        | {
            readonly type: "BOOLEAN";
            readonly factor: "eligible" | "memberPresentAtKill" | "wasPresent";
            readonly value: boolean;
          }
        | {
            readonly type: "KILL_TIME_IN_WINDOW";
            readonly from: string;
            readonly to: string;
          }
        | {
            readonly type: "RESPAWN_WINDOW_COVERAGE";
            readonly from: string;
            readonly to: string;
            readonly operator: ">" | ">=" | "<" | "<=" | "==" | "!=";
            readonly value: number;
          }
      >;
      readonly action: {
        readonly type: "SET_BASE" | "ADD_BONUS" | "ZERO_BASE";
        readonly points?: number;
      };
    }>;
  };
  readonly scoringMode?: "SIMPLE" | "ADVANCED";
  readonly heroNpcs?: ReadonlyArray<{
    readonly npcId?: number;
    readonly npcName: string;
    readonly maps: ReadonlyArray<{
      readonly mapId: number;
      readonly mapName: string;
    }>;
  }>;
};

export const CreateEventDto = Schema.Struct({
  name: Schema.String,
  world: Schema.String,
  startsAt: Schema.optionalKey(
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
  endsAt: Schema.optionalKey(
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
      version: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(1).annotate({
            expected: "a value greater than or equal to 1",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(1).annotate({
            expected: "a value less than or equal to 1",
          }),
        ),
      timezone: Schema.String,
      hardCapPoints: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ).check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      ),
      minTrackingPercentForBonuses: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(0).annotate({
              expected: "a value greater than or equal to 0",
            }),
          )
          .check(
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
                  value: Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
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
                  value: Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
                }),
              ],
              { mode: "oneOf" },
            ),
          ),
          action: Schema.Struct({
            type: Schema.Literals(["SET_BASE", "ADD_BONUS", "ZERO_BASE"]),
            points: Schema.optionalKey(
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ).check(
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

export type EventMutationResponseDto = {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly world: string;
  readonly active: boolean;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly basePointsPerKill?: number | null;
  readonly assignmentTimeoutMinutes?: number | null;
  readonly participationConfirmationMinutes?: number | null;
  readonly mapAssignmentCap?: number | null;
  readonly rulebookMarkdown?: string | null;
  readonly scoringMode: "SIMPLE" | "ADVANCED";
  readonly scoringRules:
    | string
    | number
    | boolean
    | ReadonlyArray<EventMutationResponseDto__schema0>
    | { readonly [x: string]: EventMutationResponseDto__schema0 }
    | null;
  readonly heroNpcs: ReadonlyArray<{
    readonly id: string;
    readonly npcId: number | null;
    readonly npcName: string;
    readonly npcIcon: string | null;
    readonly npcLvl: number | null;
    readonly maps: ReadonlyArray<{
      readonly id: string;
      readonly mapId: number;
      readonly mapName: string;
      readonly locationId: string | null;
      readonly assignedMembers: ReadonlyArray<{
        readonly id: number;
        readonly name: string;
        readonly avatar: string | null;
        readonly userId: string;
        readonly roles: ReadonlyArray<{
          readonly position: number;
          readonly color: number | null;
        }>;
      }>;
    }>;
  }>;
};

export const EventMutationResponseDto = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  world: Schema.String,
  active: Schema.Boolean,
  startsAt: Schema.Union([
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
    Schema.Null,
  ]),
  endsAt: Schema.Union([
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
    Schema.Null,
  ]),
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
  basePointsPerKill: Schema.optionalKey(
    Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
  ),
  assignmentTimeoutMinutes: Schema.optionalKey(
    Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
  ),
  participationConfirmationMinutes: Schema.optionalKey(
    Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
  ),
  mapAssignmentCap: Schema.optionalKey(
    Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
  ),
  rulebookMarkdown: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Null]),
  ),
  scoringMode: Schema.Literals(["SIMPLE", "ADVANCED"]),
  scoringRules: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(EventMutationResponseDto__schema0),
      Schema.Record(Schema.String, EventMutationResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  heroNpcs: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      npcId: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      maps: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          mapId: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          mapName: Schema.String,
          locationId: Schema.Union([Schema.String, Schema.Null]),
          assignedMembers: Schema.Array(
            Schema.Struct({
              id: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              name: Schema.String,
              avatar: Schema.Union([Schema.String, Schema.Null]),
              userId: Schema.String,
              roles: Schema.Array(
                Schema.Struct({
                  position: Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
                  color: Schema.Union([
                    Schema.Number.check(
                      Schema.isFinite().annotate({
                        expected: "a finite number",
                      }),
                    ),
                    Schema.Null,
                  ]),
                }),
              ),
            }),
          ),
        }),
      ),
    }),
  ),
}).annotate({ identifier: "EventMutationResponseDto" });

export type EventOverviewResponseDto = {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly world: string;
  readonly active: boolean;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly basePointsPerKill?: number | null;
  readonly assignmentTimeoutMinutes?: number | null;
  readonly participationConfirmationMinutes?: number | null;
  readonly mapAssignmentCap?: number | null;
  readonly rulebookMarkdown?: string | null;
  readonly scoringMode: "SIMPLE" | "ADVANCED";
  readonly scoringRules:
    | string
    | number
    | boolean
    | ReadonlyArray<EventOverviewResponseDto__schema0>
    | { readonly [x: string]: EventOverviewResponseDto__schema0 }
    | null;
  readonly heroNpcs: ReadonlyArray<{
    readonly id: string;
    readonly npcId: number | null;
    readonly npcName: string;
    readonly npcIcon: string | null;
    readonly npcLvl: number | null;
  }>;
};

export const EventOverviewResponseDto = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  world: Schema.String,
  active: Schema.Boolean,
  startsAt: Schema.Union([
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
    Schema.Null,
  ]),
  endsAt: Schema.Union([
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
    Schema.Null,
  ]),
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
  basePointsPerKill: Schema.optionalKey(
    Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
  ),
  assignmentTimeoutMinutes: Schema.optionalKey(
    Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
  ),
  participationConfirmationMinutes: Schema.optionalKey(
    Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
  ),
  mapAssignmentCap: Schema.optionalKey(
    Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
  ),
  rulebookMarkdown: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Null]),
  ),
  scoringMode: Schema.Literals(["SIMPLE", "ADVANCED"]),
  scoringRules: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(EventOverviewResponseDto__schema0),
      Schema.Record(Schema.String, EventOverviewResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  heroNpcs: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      npcId: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
    }),
  ),
}).annotate({ identifier: "EventOverviewResponseDto" });

export type UpdateEventDto = {
  readonly name?: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly heroNpcs?: ReadonlyArray<{
    readonly npcId?: number;
    readonly npcName: string;
    readonly maps: ReadonlyArray<{
      readonly mapId: number;
      readonly mapName: string;
    }>;
  }>;
  readonly basePointsPerKill?: number;
  readonly assignmentTimeoutMinutes?: number;
  readonly participationConfirmationMinutes?: number;
  readonly mapAssignmentCap?: number;
  readonly rulebookMarkdown?: string;
  readonly scoringRules?: {
    readonly version: number;
    readonly timezone: string;
    readonly hardCapPoints: number;
    readonly minTrackingPercentForBonuses?: number;
    readonly rules: ReadonlyArray<{
      readonly id: string;
      readonly name?: string;
      readonly enabled?: boolean;
      readonly conditions: ReadonlyArray<
        | {
            readonly type: "NUMERIC";
            readonly factor:
              | "trackingDurationPercentage"
              | "trackingDurationSeconds"
              | "assignedMembersCount"
              | "minutesSinceLeaveToKill"
              | "timeOnMapSeconds"
              | "afkPercentage"
              | "respawnDurationSeconds"
              | "respawnProgressPercentage";
            readonly operator: ">" | ">=" | "<" | "<=" | "==" | "!=";
            readonly value: number;
          }
        | {
            readonly type: "BOOLEAN";
            readonly factor: "eligible" | "memberPresentAtKill" | "wasPresent";
            readonly value: boolean;
          }
        | {
            readonly type: "KILL_TIME_IN_WINDOW";
            readonly from: string;
            readonly to: string;
          }
        | {
            readonly type: "RESPAWN_WINDOW_COVERAGE";
            readonly from: string;
            readonly to: string;
            readonly operator: ">" | ">=" | "<" | "<=" | "==" | "!=";
            readonly value: number;
          }
      >;
      readonly action: {
        readonly type: "SET_BASE" | "ADD_BONUS" | "ZERO_BASE";
        readonly points?: number;
      };
    }>;
  };
  readonly scoringMode?: "SIMPLE" | "ADVANCED";
};

export const UpdateEventDto = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
  startsAt: Schema.optionalKey(
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
  endsAt: Schema.optionalKey(
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
      version: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(1).annotate({
            expected: "a value greater than or equal to 1",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(1).annotate({
            expected: "a value less than or equal to 1",
          }),
        ),
      timezone: Schema.String,
      hardCapPoints: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ).check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      ),
      minTrackingPercentForBonuses: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(0).annotate({
              expected: "a value greater than or equal to 0",
            }),
          )
          .check(
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
                  value: Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
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
                  value: Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
                }),
              ],
              { mode: "oneOf" },
            ),
          ),
          action: Schema.Struct({
            type: Schema.Literals(["SET_BASE", "ADD_BONUS", "ZERO_BASE"]),
            points: Schema.optionalKey(
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ).check(
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

export type EventWrappedApiResponseDto_Output = {
  readonly generatedAt: string;
  readonly event: {
    readonly id: string;
    readonly name: string;
    readonly world: string;
    readonly startsAt: string | null;
    readonly endsAt: string | null;
    readonly heroCount: number;
    readonly mapCount: number;
    readonly spawnCount: number;
  };
  readonly overview: {
    readonly totalKills: number;
    readonly participantCount: number;
    readonly totalPoints: number;
    readonly totalTrackedSeconds: number;
    readonly totalAfkSeconds: number;
    readonly coveragePercentage: number;
    readonly avgMapsPerSpawnWindow: number;
    readonly busiestHour: number | null;
    readonly busiestHourKills: number;
    readonly totalLoots: number;
    readonly rarityTotals: {
      readonly unique: number;
      readonly heroic: number;
      readonly legendary: number;
    };
  };
  readonly leaders: {
    readonly topHunter: {
      readonly winner:
        | ({
            readonly memberId: number;
            readonly name: string;
            readonly avatar: string | null;
            readonly primaryValue: number;
            readonly secondaryValue?: number | null;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly candidateCount: number;
      readonly tiedWinnerCount: number;
    };
    readonly topScorer: {
      readonly winner:
        | ({
            readonly memberId: number;
            readonly name: string;
            readonly avatar: string | null;
            readonly primaryValue: number;
            readonly secondaryValue?: number | null;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly candidateCount: number;
      readonly tiedWinnerCount: number;
    };
    readonly longestDuty: {
      readonly winner:
        | ({
            readonly memberId: number;
            readonly name: string;
            readonly avatar: string | null;
            readonly primaryValue: number;
            readonly secondaryValue?: number | null;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly candidateCount: number;
      readonly tiedWinnerCount: number;
    };
    readonly topAfk: {
      readonly winner:
        | ({
            readonly memberId: number;
            readonly name: string;
            readonly avatar: string | null;
            readonly primaryValue: number;
            readonly secondaryValue?: number | null;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly candidateCount: number;
      readonly tiedWinnerCount: number;
    };
    readonly mostFlexible: {
      readonly winner:
        | ({
            readonly memberId: number;
            readonly name: string;
            readonly avatar: string | null;
            readonly primaryValue: number;
            readonly secondaryValue?: number | null;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly candidateCount: number;
      readonly tiedWinnerCount: number;
    };
    readonly topEfficiency: {
      readonly winner:
        | ({
            readonly memberId: number;
            readonly name: string;
            readonly avatar: string | null;
            readonly primaryValue: number;
            readonly secondaryValue?: number | null;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly candidateCount: number;
      readonly tiedWinnerCount: number;
    };
  };
  readonly coverage: {
    readonly totalWindowCount: number;
    readonly totalWindowSeconds: number;
    readonly totalCoverageSeconds: number;
    readonly totalUncoveredSeconds: number;
    readonly totalUnassignedSeconds: number;
    readonly coveragePercentage: number;
    readonly avgMapsPerSpawnWindow: number;
    readonly bestHeroCoverage:
      | ({
          readonly heroNpcId: string;
          readonly npcName: string;
          readonly npcIcon: string | null;
          readonly mapCount: number;
          readonly totalKills: number;
          readonly coveragePercentage: number;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly roughestHeroCoverage:
      | ({
          readonly heroNpcId: string;
          readonly npcName: string;
          readonly npcIcon: string | null;
          readonly mapCount: number;
          readonly totalKills: number;
          readonly coveragePercentage: number;
        } & { readonly [x: string]: Schema.Json })
      | null;
  };
  readonly heroes: ReadonlyArray<{
    readonly heroNpcId: string;
    readonly npcId: number | null;
    readonly npcName: string;
    readonly npcIcon: string | null;
    readonly mapCount: number;
    readonly totalKills: number;
    readonly totalPoints: number;
    readonly coveragePercentage: number;
    readonly rarityTotals: {
      readonly unique: number;
      readonly heroic: number;
      readonly legendary: number;
    };
    readonly topHunter: {
      readonly winner:
        | ({
            readonly memberId: number;
            readonly name: string;
            readonly avatar: string | null;
            readonly primaryValue: number;
            readonly secondaryValue?: number | null;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly candidateCount: number;
      readonly tiedWinnerCount: number;
    };
  }>;
  readonly loot: {
    readonly totalLoots: number;
    readonly rarityTotals: {
      readonly unique: number;
      readonly heroic: number;
      readonly legendary: number;
    };
    readonly heroBreakdown: ReadonlyArray<{
      readonly heroNpcId: string;
      readonly npcName: string;
      readonly npcIcon: string | null;
      readonly totalLoots: number;
      readonly rarityTotals: {
        readonly unique: number;
        readonly heroic: number;
        readonly legendary: number;
      };
    }>;
  };
};

export const EventWrappedApiResponseDto_Output = Schema.Struct({
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
  event: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    world: Schema.String,
    startsAt: Schema.Union([
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
      Schema.Null,
    ]),
    endsAt: Schema.Union([
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
      Schema.Null,
    ]),
    heroCount: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    mapCount: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    spawnCount: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  }),
  overview: Schema.Struct({
    totalKills: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    participantCount: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalPoints: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalTrackedSeconds: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalAfkSeconds: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    coveragePercentage: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    avgMapsPerSpawnWindow: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    busiestHour: Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
    busiestHourKills: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalLoots: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    rarityTotals: Schema.Struct({
      unique: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      heroic: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legendary: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  }),
  leaders: Schema.Struct({
    topHunter: Schema.Struct({
      winner: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            memberId: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            primaryValue: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            secondaryValue: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
                Schema.Null,
              ]),
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
      candidateCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      tiedWinnerCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
    topScorer: Schema.Struct({
      winner: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            memberId: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            primaryValue: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            secondaryValue: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
                Schema.Null,
              ]),
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
      candidateCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      tiedWinnerCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
    longestDuty: Schema.Struct({
      winner: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            memberId: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            primaryValue: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            secondaryValue: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
                Schema.Null,
              ]),
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
      candidateCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      tiedWinnerCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
    topAfk: Schema.Struct({
      winner: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            memberId: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            primaryValue: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            secondaryValue: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
                Schema.Null,
              ]),
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
      candidateCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      tiedWinnerCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
    mostFlexible: Schema.Struct({
      winner: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            memberId: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            primaryValue: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            secondaryValue: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
                Schema.Null,
              ]),
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
      candidateCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      tiedWinnerCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
    topEfficiency: Schema.Struct({
      winner: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            memberId: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            name: Schema.String,
            avatar: Schema.Union([Schema.String, Schema.Null]),
            primaryValue: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            secondaryValue: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
                Schema.Null,
              ]),
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
      candidateCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      tiedWinnerCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  }),
  coverage: Schema.Struct({
    totalWindowCount: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalWindowSeconds: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalCoverageSeconds: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalUncoveredSeconds: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalUnassignedSeconds: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    coveragePercentage: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    avgMapsPerSpawnWindow: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    bestHeroCoverage: Schema.Union([
      Schema.StructWithRest(
        Schema.Struct({
          heroNpcId: Schema.String,
          npcName: Schema.String,
          npcIcon: Schema.Union([Schema.String, Schema.Null]),
          mapCount: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          totalKills: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          coveragePercentage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
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
    roughestHeroCoverage: Schema.Union([
      Schema.StructWithRest(
        Schema.Struct({
          heroNpcId: Schema.String,
          npcName: Schema.String,
          npcIcon: Schema.Union([Schema.String, Schema.Null]),
          mapCount: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          totalKills: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          coveragePercentage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
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
  heroes: Schema.Array(
    Schema.Struct({
      heroNpcId: Schema.String,
      npcId: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      mapCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      totalKills: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      totalPoints: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      coveragePercentage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      rarityTotals: Schema.Struct({
        unique: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        heroic: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        legendary: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      }),
      topHunter: Schema.Struct({
        winner: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              memberId: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              name: Schema.String,
              avatar: Schema.Union([Schema.String, Schema.Null]),
              primaryValue: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              secondaryValue: Schema.optionalKey(
                Schema.Union([
                  Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
                  Schema.Null,
                ]),
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
        candidateCount: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        tiedWinnerCount: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      }),
    }),
  ),
  loot: Schema.Struct({
    totalLoots: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    rarityTotals: Schema.Struct({
      unique: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      heroic: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      legendary: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
    heroBreakdown: Schema.Array(
      Schema.Struct({
        heroNpcId: Schema.String,
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        totalLoots: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        rarityTotals: Schema.Struct({
          unique: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          heroic: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          legendary: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        }),
      }),
    ),
  }),
}).annotate({ identifier: "EventWrappedApiResponseDto_Output" });

export type EventMapsResponseDto_Output = {
  readonly id: string;
  readonly heroNpcs: ReadonlyArray<{
    readonly id: string;
    readonly npcId: number | null;
    readonly npcName: string;
    readonly npcIcon: string | null;
    readonly npcLvl: number | null;
    readonly locations: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
      readonly order: number;
      readonly maps: ReadonlyArray<{
        readonly id: string;
        readonly mapId: number;
        readonly mapName: string;
        readonly locationId: string | null;
        readonly assignedMembers: ReadonlyArray<{
          readonly id: number;
          readonly name: string;
          readonly avatar: string | null;
          readonly userId: string;
          readonly roles: ReadonlyArray<{
            readonly position: number;
            readonly color: number | null;
          }>;
        }>;
      }>;
    }>;
    readonly maps: ReadonlyArray<{
      readonly id: string;
      readonly mapId: number;
      readonly mapName: string;
      readonly locationId: string | null;
      readonly assignedMembers: ReadonlyArray<{
        readonly id: number;
        readonly name: string;
        readonly avatar: string | null;
        readonly userId: string;
        readonly roles: ReadonlyArray<{
          readonly position: number;
          readonly color: number | null;
        }>;
      }>;
    }>;
  }>;
};

export const EventMapsResponseDto_Output = Schema.Struct({
  id: Schema.String,
  heroNpcs: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      npcId: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      locations: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          name: Schema.String,
          order: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          maps: Schema.Array(
            Schema.Struct({
              id: Schema.String,
              mapId: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              mapName: Schema.String,
              locationId: Schema.Union([Schema.String, Schema.Null]),
              assignedMembers: Schema.Array(
                Schema.Struct({
                  id: Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
                  name: Schema.String,
                  avatar: Schema.Union([Schema.String, Schema.Null]),
                  userId: Schema.String,
                  roles: Schema.Array(
                    Schema.Struct({
                      position: Schema.Number.check(
                        Schema.isFinite().annotate({
                          expected: "a finite number",
                        }),
                      ),
                      color: Schema.Union([
                        Schema.Number.check(
                          Schema.isFinite().annotate({
                            expected: "a finite number",
                          }),
                        ),
                        Schema.Null,
                      ]),
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
          mapId: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          mapName: Schema.String,
          locationId: Schema.Union([Schema.String, Schema.Null]),
          assignedMembers: Schema.Array(
            Schema.Struct({
              id: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              name: Schema.String,
              avatar: Schema.Union([Schema.String, Schema.Null]),
              userId: Schema.String,
              roles: Schema.Array(
                Schema.Struct({
                  position: Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
                  color: Schema.Union([
                    Schema.Number.check(
                      Schema.isFinite().annotate({
                        expected: "a finite number",
                      }),
                    ),
                    Schema.Null,
                  ]),
                }),
              ),
            }),
          ),
        }),
      ),
    }),
  ),
}).annotate({ identifier: "EventMapsResponseDto_Output" });

export type AssignMemberDto = { readonly memberId: number };

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

export type CreateHeroDto = {
  readonly npcId?: number;
  readonly npcName: string;
  readonly maps?: ReadonlyArray<{
    readonly mapId: number;
    readonly mapName: string;
  }>;
};

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

export type UpdateHeroDto = {
  readonly npcName: string;
  readonly npcId?: number;
};

export const UpdateHeroDto = Schema.Struct({
  npcName: Schema.String,
  npcId: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
}).annotate({ identifier: "UpdateHeroDto" });

export type CreateMapDto = { readonly mapId: number; readonly mapName: string };

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

export type EventMapResponseDto_Output = {
  readonly id: string;
  readonly mapId: number;
  readonly mapName: string;
  readonly locationId: string | null;
  readonly assignedMembers: ReadonlyArray<{
    readonly id: number;
    readonly name: string;
    readonly avatar: string | null;
    readonly userId: string;
    readonly roles: ReadonlyArray<{
      readonly position: number;
      readonly color: number | null;
    }>;
  }>;
};

export const EventMapResponseDto_Output = Schema.Struct({
  id: Schema.String,
  mapId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  mapName: Schema.String,
  locationId: Schema.Union([Schema.String, Schema.Null]),
  assignedMembers: Schema.Array(
    Schema.Struct({
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      name: Schema.String,
      avatar: Schema.Union([Schema.String, Schema.Null]),
      userId: Schema.String,
      roles: Schema.Array(
        Schema.Struct({
          position: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          color: Schema.Union([
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Null,
          ]),
        }),
      ),
    }),
  ),
}).annotate({ identifier: "EventMapResponseDto_Output" });

export type CreateLocationDto = { readonly name: string };

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

export type UpdateLocationDto = { readonly name?: string };

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

export type ReorderLocationsDto = {
  readonly locationIds: ReadonlyArray<string>;
};

export const ReorderLocationsDto = Schema.Struct({
  locationIds: Schema.Array(Schema.String),
}).annotate({ identifier: "ReorderLocationsDto" });

export type AssignMapLocationDto = { readonly locationId?: string | null };

export const AssignMapLocationDto = Schema.Struct({
  locationId: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
}).annotate({ identifier: "AssignMapLocationDto" });

export type PendingParticipationConfirmationsResponseDto = {
  readonly items: ReadonlyArray<{
    readonly killId: string;
    readonly killedAt: string;
    readonly confirmationDeadlineAt: string;
    readonly heroNpc: {
      readonly id: string;
      readonly npcId: number | null;
      readonly npcName: string;
      readonly npcIcon: string | null;
      readonly npcLvl: number | null;
    };
  }>;
  readonly expiredItems: ReadonlyArray<{
    readonly killId: string;
    readonly killedAt: string;
    readonly confirmationDeadlineAt: string;
    readonly heroNpc: {
      readonly id: string;
      readonly npcId: number | null;
      readonly npcName: string;
      readonly npcIcon: string | null;
      readonly npcLvl: number | null;
    };
  }>;
};

export const PendingParticipationConfirmationsResponseDto = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      killId: Schema.String,
      killedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
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
        npcId: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        npcLvl: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
      }),
    }),
  ),
  expiredItems: Schema.Array(
    Schema.Struct({
      killId: Schema.String,
      killedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
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
        npcId: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        npcLvl: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
      }),
    }),
  ),
}).annotate({ identifier: "PendingParticipationConfirmationsResponseDto" });

export type AcknowledgeExpiredParticipationConfirmationsDto = {
  readonly killIds: ReadonlyArray<string>;
};

export const AcknowledgeExpiredParticipationConfirmationsDto = Schema.Struct({
  killIds: Schema.Array(Schema.String).check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
}).annotate({ identifier: "AcknowledgeExpiredParticipationConfirmationsDto" });

export type AcknowledgeExpiredParticipationConfirmationsResponseDto_Output = {
  readonly acknowledgedCount: number;
};

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

export type ConfirmParticipationForKillResponseDto_Output = {
  readonly success: boolean;
  readonly confirmedNow: boolean;
};

export const ConfirmParticipationForKillResponseDto_Output = Schema.Struct({
  success: Schema.Boolean,
  confirmedNow: Schema.Boolean,
}).annotate({ identifier: "ConfirmParticipationForKillResponseDto_Output" });

export type EventRankingEntryResponseDto = {
  readonly id: string;
  readonly eventId: string;
  readonly memberId: number;
  readonly heroNpcName: string;
  readonly totalPoints: number;
  readonly totalKills: number;
  readonly totalTimeSeconds: number;
  readonly avgAfkPercentage: number;
  readonly pointsModified: boolean;
  readonly updatedAt: string;
  readonly member: {
    readonly id: number;
    readonly name: string;
    readonly roles: ReadonlyArray<{
      readonly position: number;
      readonly color: number | null;
    }>;
  };
  readonly editHistory: ReadonlyArray<{
    readonly id: string;
    readonly rankingId: string;
    readonly previousPoints: number;
    readonly newPoints: number;
    readonly deltaPoints: number;
    readonly editType: "KILL_POINT" | "RANKING";
    readonly editedByUserId: string;
    readonly editedByName: string | null;
    readonly comment: string | null;
    readonly editedAt: string;
  }>;
};

export const EventRankingEntryResponseDto = Schema.Struct({
  id: Schema.String,
  eventId: Schema.String,
  memberId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  heroNpcName: Schema.String,
  totalPoints: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  totalKills: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  totalTimeSeconds: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  avgAfkPercentage: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  pointsModified: Schema.Boolean,
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
  member: Schema.Struct({
    id: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    name: Schema.String,
    roles: Schema.Array(
      Schema.Struct({
        position: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        color: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
      }),
    ),
  }),
  editHistory: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      rankingId: Schema.String,
      previousPoints: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      newPoints: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      deltaPoints: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      editType: Schema.Literals(["KILL_POINT", "RANKING"]),
      editedByUserId: Schema.String,
      editedByName: Schema.Union([Schema.String, Schema.Null]),
      comment: Schema.Union([Schema.String, Schema.Null]),
      editedAt: Schema.String.annotate({ format: "date-time" }).check(
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
}).annotate({ identifier: "EventRankingEntryResponseDto" });

export type UpdateRankingPointsDto = {
  readonly pointsDelta: number;
  readonly comment?: string;
};

export const UpdateRankingPointsDto = Schema.Struct({
  pointsDelta: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  comment: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(500).annotate({
        expected: "a value with a length of at most 500",
      }),
    ),
  ),
}).annotate({ identifier: "UpdateRankingPointsDto" });

export type EventTimerResponseDto = {
  readonly npcId: number;
  readonly world: string;
  readonly minSpawnTime: string;
  readonly maxSpawnTime: string;
  readonly npc: { readonly name: string; readonly icon: string | null };
};

export const EventTimerResponseDto = Schema.Struct({
  npcId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  world: Schema.String,
  minSpawnTime: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  maxSpawnTime: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  npc: Schema.Struct({
    name: Schema.String,
    icon: Schema.Union([Schema.String, Schema.Null]),
  }),
}).annotate({ identifier: "EventTimerResponseDto" });

export type EventHeroStatsResponseDto = {
  readonly heroId: string;
  readonly npcId: number | null;
  readonly npcName: string;
  readonly npcLvl: number | null;
  readonly npcProf: string | null;
  readonly killCount: number;
};

export const EventHeroStatsResponseDto = Schema.Struct({
  heroId: Schema.String,
  npcId: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  npcName: Schema.String,
  npcLvl: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  npcProf: Schema.Union([Schema.String, Schema.Null]),
  killCount: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
}).annotate({ identifier: "EventHeroStatsResponseDto" });

export type EventKillHistoryResponseDto = {
  readonly data: ReadonlyArray<{
    readonly id: string;
    readonly heroNpcId: string;
    readonly killedAt: string;
    readonly minSpawnTimeAtKill: string;
    readonly maxSpawnTimeAtKill: string;
    readonly isManualClose: boolean;
    readonly heroNpc: {
      readonly id: string;
      readonly npcId: number | null;
      readonly npcName: string;
      readonly npcIcon: string | null;
      readonly npcLvl: number | null;
    };
    readonly points: ReadonlyArray<{
      readonly id: string;
      readonly memberId: number;
      readonly points: number;
      readonly basePoints: number;
      readonly manualAdjustmentPoints?: number | null;
      readonly trackingDurationSeconds: number | null;
      readonly trackingDurationPercentage: number | null;
      readonly timeOnMapSeconds: number;
      readonly afkPercentage: number;
      readonly wasPresent: boolean;
      readonly bonusBreakdown?:
        | string
        | number
        | boolean
        | ReadonlyArray<EventKillHistoryResponseDto__schema0>
        | { readonly [x: string]: EventKillHistoryResponseDto__schema0 }
        | null;
      readonly member: {
        readonly id: number;
        readonly name: string;
        readonly avatar: string | null;
        readonly userId: string;
      };
      readonly mapData?: ReadonlyArray<{
        readonly mapId: string;
        readonly mapName: string;
        readonly assignedAt: string;
        readonly unassignedAt: string | null;
        readonly assignmentDurationSeconds: number;
        readonly presenceTimeSeconds: number;
        readonly afkTimeSeconds: number;
      }>;
    }>;
  }>;
  readonly nextCursor: string | null;
};

export const EventKillHistoryResponseDto = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      heroNpcId: Schema.String,
      killedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      minSpawnTimeAtKill: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      maxSpawnTimeAtKill: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      isManualClose: Schema.Boolean,
      heroNpc: Schema.Struct({
        id: Schema.String,
        npcId: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        npcLvl: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
      }),
      points: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          memberId: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          points: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          basePoints: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          manualAdjustmentPoints: Schema.optionalKey(
            Schema.Union([
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              Schema.Null,
            ]),
          ),
          trackingDurationSeconds: Schema.Union([
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Null,
          ]),
          trackingDurationPercentage: Schema.Union([
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Null,
          ]),
          timeOnMapSeconds: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          afkPercentage: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          wasPresent: Schema.Boolean,
          bonusBreakdown: Schema.optionalKey(
            Schema.Union([
              Schema.Union([
                Schema.String,
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
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
            id: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
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
                unassignedAt: Schema.Union([
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
                  Schema.Null,
                ]),
                assignmentDurationSeconds: Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
                presenceTimeSeconds: Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
                afkTimeSeconds: Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
              }),
            ),
          ),
        }),
      ),
    }),
  ),
  nextCursor: Schema.Union([Schema.String, Schema.Null]),
}).annotate({ identifier: "EventKillHistoryResponseDto" });

export type EventMemberKillHistoryResponseDto = {
  readonly member: {
    readonly id: number;
    readonly name: string;
    readonly avatar: string | null;
    readonly userId: string;
  };
  readonly data: ReadonlyArray<{
    readonly id: string;
    readonly heroNpcId: string;
    readonly killedAt: string;
    readonly minSpawnTimeAtKill: string;
    readonly maxSpawnTimeAtKill: string;
    readonly isManualClose: boolean;
    readonly heroNpc: {
      readonly id: string;
      readonly npcId: number | null;
      readonly npcName: string;
      readonly npcIcon: string | null;
      readonly npcLvl: number | null;
    };
    readonly memberPoint:
      | ({
          readonly id: string;
          readonly memberId: number;
          readonly points: number;
          readonly basePoints: number;
          readonly manualAdjustmentPoints?: number | null;
          readonly trackingDurationSeconds: number | null;
          readonly trackingDurationPercentage: number | null;
          readonly timeOnMapSeconds: number;
          readonly afkPercentage: number;
          readonly wasPresent: boolean;
          readonly bonusBreakdown?:
            | string
            | number
            | boolean
            | ReadonlyArray<EventMemberKillHistoryResponseDto__schema0>
            | {
                readonly [x: string]: EventMemberKillHistoryResponseDto__schema0;
              }
            | null;
          readonly member: {
            readonly id: number;
            readonly name: string;
            readonly avatar: string | null;
            readonly userId: string;
          };
          readonly mapData?: ReadonlyArray<{
            readonly mapId: string;
            readonly mapName: string;
            readonly assignedAt: string;
            readonly unassignedAt: string | null;
            readonly assignmentDurationSeconds: number;
            readonly presenceTimeSeconds: number;
            readonly afkTimeSeconds: number;
          }>;
        } & { readonly [x: string]: Schema.Json })
      | null;
  }>;
  readonly nextCursor: string | null;
};

export const EventMemberKillHistoryResponseDto = Schema.Struct({
  member: Schema.Struct({
    id: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    name: Schema.String,
    avatar: Schema.Union([Schema.String, Schema.Null]),
    userId: Schema.String,
  }),
  data: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      heroNpcId: Schema.String,
      killedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      minSpawnTimeAtKill: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      maxSpawnTimeAtKill: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      isManualClose: Schema.Boolean,
      heroNpc: Schema.Struct({
        id: Schema.String,
        npcId: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        npcLvl: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
      }),
      memberPoint: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            id: Schema.String,
            memberId: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            points: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            basePoints: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            manualAdjustmentPoints: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
                Schema.Null,
              ]),
            ),
            trackingDurationSeconds: Schema.Union([
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              Schema.Null,
            ]),
            trackingDurationPercentage: Schema.Union([
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              Schema.Null,
            ]),
            timeOnMapSeconds: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            afkPercentage: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            wasPresent: Schema.Boolean,
            bonusBreakdown: Schema.optionalKey(
              Schema.Union([
                Schema.Union([
                  Schema.String,
                  Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
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
              id: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
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
                  unassignedAt: Schema.Union([
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
                    Schema.Null,
                  ]),
                  assignmentDurationSeconds: Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
                  presenceTimeSeconds: Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
                  afkTimeSeconds: Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
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

export type KillDetailResponseDto = {
  readonly kill: {
    readonly id: string;
    readonly heroNpcId: string;
    readonly killedAt: string;
    readonly minSpawnTimeAtKill: string;
    readonly maxSpawnTimeAtKill: string;
    readonly timerCreatedById: number | null;
    readonly isManualClose: boolean;
    readonly respawnDurationSeconds: number | null;
    readonly windowDurationSeconds: number | null;
    readonly resolvedAfterMaxSpawnTimeMs: number | null;
    readonly heroNpc: {
      readonly id: string;
      readonly npcId: number | null;
      readonly npcName: string;
      readonly npcIcon: string | null;
      readonly npcLvl: number | null;
      readonly event: {
        readonly id: string;
        readonly name: string;
        readonly world: string;
      };
    };
    readonly timerCreatedBy:
      | ({
          readonly id: number;
          readonly name: string;
          readonly avatar: string | null;
          readonly userId: string;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly points: ReadonlyArray<{
      readonly id: string;
      readonly memberId: number;
      readonly points: number;
      readonly basePoints: number;
      readonly manualAdjustmentPoints?: number | null;
      readonly trackingDurationSeconds: number | null;
      readonly trackingDurationPercentage: number | null;
      readonly timeOnMapSeconds: number;
      readonly afkPercentage: number;
      readonly wasPresent: boolean;
      readonly bonusBreakdown?:
        | string
        | number
        | boolean
        | ReadonlyArray<KillDetailResponseDto__schema0>
        | { readonly [x: string]: KillDetailResponseDto__schema0 }
        | null;
      readonly member: {
        readonly id: number;
        readonly name: string;
        readonly avatar: string | null;
        readonly userId: string;
        readonly roles: ReadonlyArray<{
          readonly position: number | null;
          readonly color: number | null;
        }>;
      };
      readonly mapData?: ReadonlyArray<{
        readonly mapId: string;
        readonly mapName: string;
        readonly assignedAt: string;
        readonly unassignedAt: string | null;
        readonly assignmentDurationSeconds: number;
        readonly presenceTimeSeconds: number;
        readonly afkTimeSeconds: number;
      }>;
    }>;
  };
  readonly eventConfig: {
    readonly scoringMode: "SIMPLE" | "ADVANCED";
    readonly scoringRules:
      | string
      | number
      | boolean
      | ReadonlyArray<KillDetailResponseDto__schema0>
      | { readonly [x: string]: KillDetailResponseDto__schema0 }
      | null;
  };
};

export const KillDetailResponseDto = Schema.Struct({
  kill: Schema.Struct({
    id: Schema.String,
    heroNpcId: Schema.String,
    killedAt: Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
    minSpawnTimeAtKill: Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
    maxSpawnTimeAtKill: Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
    timerCreatedById: Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
    isManualClose: Schema.Boolean,
    respawnDurationSeconds: Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
    windowDurationSeconds: Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
    resolvedAfterMaxSpawnTimeMs: Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
    heroNpc: Schema.Struct({
      id: Schema.String,
      npcId: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      event: Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        world: Schema.String,
      }),
    }),
    timerCreatedBy: Schema.Union([
      Schema.StructWithRest(
        Schema.Struct({
          id: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
        memberId: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        points: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        basePoints: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        manualAdjustmentPoints: Schema.optionalKey(
          Schema.Union([
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Null,
          ]),
        ),
        trackingDurationSeconds: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
        trackingDurationPercentage: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
        timeOnMapSeconds: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        afkPercentage: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        wasPresent: Schema.Boolean,
        bonusBreakdown: Schema.optionalKey(
          Schema.Union([
            Schema.Union([
              Schema.String,
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              Schema.Boolean,
              Schema.Array(KillDetailResponseDto__schema0),
              Schema.Record(Schema.String, KillDetailResponseDto__schema0),
            ]),
            Schema.Null,
          ]),
        ),
        member: Schema.Struct({
          id: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          name: Schema.String,
          avatar: Schema.Union([Schema.String, Schema.Null]),
          userId: Schema.String,
          roles: Schema.Array(
            Schema.Struct({
              position: Schema.Union([
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
                Schema.Null,
              ]),
              color: Schema.Union([
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
                Schema.Null,
              ]),
            }),
          ),
        }),
        mapData: Schema.optionalKey(
          Schema.Array(
            Schema.Struct({
              mapId: Schema.String,
              mapName: Schema.String,
              assignedAt: Schema.String.annotate({ format: "date-time" }).check(
                Schema.isPattern(
                  new RegExp(
                    "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                  ),
                ).annotate({
                  expected:
                    "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                }),
              ),
              unassignedAt: Schema.Union([
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
                Schema.Null,
              ]),
              assignmentDurationSeconds: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              presenceTimeSeconds: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              afkTimeSeconds: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
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
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Boolean,
        Schema.Array(KillDetailResponseDto__schema0),
        Schema.Record(Schema.String, KillDetailResponseDto__schema0),
      ]),
      Schema.Null,
    ]),
  }),
}).annotate({ identifier: "KillDetailResponseDto" });

export type UpdateKillPointDto = {
  readonly pointsDelta: number;
  readonly comment?: string;
};

export const UpdateKillPointDto = Schema.Struct({
  pointsDelta: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  comment: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(500).annotate({
        expected: "a value with a length of at most 500",
      }),
    ),
  ),
}).annotate({ identifier: "UpdateKillPointDto" });

export type EventCoordinationResponseDto = {
  readonly assignmentTimeoutMinutes: number;
  readonly generatedAt: string;
  readonly eventId: string;
  readonly world: string;
  readonly summary: {
    readonly criticalCount: number;
    readonly warningCount: number;
    readonly coveredMaps: number;
    readonly totalMaps: number;
    readonly nextSpawnAt: string | null;
  };
  readonly heroes: ReadonlyArray<{
    readonly heroId: string;
    readonly npcId: number | null;
    readonly npcName: string;
    readonly npcIcon: string | null;
    readonly npcLvl: number | null;
    readonly timer:
      | ({
          readonly npcId: number;
          readonly world: string;
          readonly minSpawnTime: string;
          readonly maxSpawnTime: string;
          readonly status: "OPEN" | "WAITING" | "OVERDUE" | "NONE";
          readonly overdueMs: number | null;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly coverage: {
      readonly totalMaps: number;
      readonly assignedMaps: number;
      readonly coveredMaps: number;
      readonly unassignedMaps: number;
      readonly uncoveredMaps: number;
      readonly activeGapCount: number;
    };
    readonly activeGaps: ReadonlyArray<{
      readonly id: string;
      readonly mapId: string;
      readonly numericMapId: number;
      readonly mapName: string;
      readonly gapType: "UNASSIGNED" | "UNCOVERED";
      readonly startedAt: string;
      readonly durationSeconds: number;
    }>;
    readonly priority: "CRITICAL" | "WARNING" | "OK" | "IDLE";
    readonly recommendedAction:
      | "CLOSE_WINDOW"
      | "ASSIGN_MAPS"
      | "JOIN_MAP"
      | "WAIT"
      | "NONE";
  }>;
};

export const EventCoordinationResponseDto = Schema.Struct({
  assignmentTimeoutMinutes: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
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
  eventId: Schema.String,
  world: Schema.String,
  summary: Schema.Struct({
    criticalCount: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    warningCount: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    coveredMaps: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalMaps: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    nextSpawnAt: Schema.Union([
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
      Schema.Null,
    ]),
  }),
  heroes: Schema.Array(
    Schema.Struct({
      heroId: Schema.String,
      npcId: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      timer: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            npcId: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            world: Schema.String,
            minSpawnTime: Schema.String.annotate({ format: "date-time" }).check(
              Schema.isPattern(
                new RegExp(
                  "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                ),
              ).annotate({
                expected:
                  "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              }),
            ),
            maxSpawnTime: Schema.String.annotate({ format: "date-time" }).check(
              Schema.isPattern(
                new RegExp(
                  "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                ),
              ).annotate({
                expected:
                  "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              }),
            ),
            status: Schema.Literals(["OPEN", "WAITING", "OVERDUE", "NONE"]),
            overdueMs: Schema.Union([
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              Schema.Null,
            ]),
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
        totalMaps: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        assignedMaps: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        coveredMaps: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        unassignedMaps: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        uncoveredMaps: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        activeGapCount: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      }),
      activeGaps: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          mapId: Schema.String,
          numericMapId: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          mapName: Schema.String,
          gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
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
          durationSeconds: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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

export type KillTimelineMapResponseDto = {
  readonly mapId: string;
  readonly mapName: string;
  readonly numericMapId: number;
  readonly assignments: ReadonlyArray<{
    readonly memberId: number;
    readonly memberName: string;
    readonly memberAvatar: string | null;
    readonly memberUserId: string;
    readonly assignedAt: string;
    readonly unassignedAt: string | null;
  }>;
  readonly gaps: ReadonlyArray<{
    readonly id: string;
    readonly gapType: "UNASSIGNED" | "UNCOVERED";
    readonly startedAt: string;
    readonly endedAt: string | null;
    readonly durationSeconds: number | null;
  }>;
};

export const KillTimelineMapResponseDto = Schema.Struct({
  mapId: Schema.String,
  mapName: Schema.String,
  numericMapId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  assignments: Schema.Array(
    Schema.Struct({
      memberId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      memberName: Schema.String,
      memberAvatar: Schema.Union([Schema.String, Schema.Null]),
      memberUserId: Schema.String,
      assignedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      unassignedAt: Schema.Union([
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
        Schema.Null,
      ]),
    }),
  ),
  gaps: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
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
      endedAt: Schema.Union([
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
        Schema.Null,
      ]),
      durationSeconds: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
    }),
  ),
}).annotate({ identifier: "KillTimelineMapResponseDto" });

export type HeroCoverageGapResponseDto = {
  readonly id: string;
  readonly mapId: string;
  readonly heroNpcId: string;
  readonly gapType: "UNASSIGNED" | "UNCOVERED";
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly durationSeconds: number | null;
  readonly map: { readonly mapName: string; readonly mapId: number };
};

export const HeroCoverageGapResponseDto = Schema.Struct({
  id: Schema.String,
  mapId: Schema.String,
  heroNpcId: Schema.String,
  gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
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
  endedAt: Schema.Union([
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
    Schema.Null,
  ]),
  durationSeconds: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  map: Schema.Struct({
    mapName: Schema.String,
    mapId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  }),
}).annotate({ identifier: "HeroCoverageGapResponseDto" });

export type CoverageGapResponseDto = {
  readonly id: string;
  readonly mapId: string;
  readonly heroNpcId: string;
  readonly gapType: "UNASSIGNED" | "UNCOVERED";
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly durationSeconds: number | null;
};

export const CoverageGapResponseDto = Schema.Struct({
  id: Schema.String,
  mapId: Schema.String,
  heroNpcId: Schema.String,
  gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
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
  endedAt: Schema.Union([
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
    Schema.Null,
  ]),
  durationSeconds: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
}).annotate({ identifier: "CoverageGapResponseDto" });

export type NullableCoverageGapResponseDto =
  | ({
      readonly id: string;
      readonly mapId: string;
      readonly heroNpcId: string;
      readonly gapType: "UNASSIGNED" | "UNCOVERED";
      readonly startedAt: string;
      readonly endedAt: string | null;
      readonly durationSeconds: number | null;
    } & { readonly [x: string]: Schema.Json })
  | null;

export const NullableCoverageGapResponseDto = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      id: Schema.String,
      mapId: Schema.String,
      heroNpcId: Schema.String,
      gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
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
      endedAt: Schema.Union([
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
        Schema.Null,
      ]),
      durationSeconds: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
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

export type HeroPresenceStatsResponseDto = {
  readonly totalCoverageSeconds: number;
  readonly totalEventSeconds: number;
  readonly presencePercentage: number;
  readonly memberStats: ReadonlyArray<{
    readonly memberId: number;
    readonly memberName: string;
    readonly memberAvatar: string | null;
    readonly totalTimeSeconds: number;
    readonly afkTimeSeconds: number;
    readonly afkPercentage: number;
  }>;
};

export const HeroPresenceStatsResponseDto = Schema.Struct({
  totalCoverageSeconds: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  totalEventSeconds: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  presencePercentage: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  memberStats: Schema.Array(
    Schema.Struct({
      memberId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      memberName: Schema.String,
      memberAvatar: Schema.Union([Schema.String, Schema.Null]),
      totalTimeSeconds: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      afkTimeSeconds: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      afkPercentage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
}).annotate({ identifier: "HeroPresenceStatsResponseDto" });

export type HeroRespawnConfigResponseDto = {
  readonly hasTimer: boolean;
  readonly windowStatus: "OPEN" | "WAITING" | "OVERDUE" | "NONE";
  readonly minSpawnTime: string | null;
  readonly maxSpawnTime: string | null;
  readonly overdueMs: number | null;
};

export const HeroRespawnConfigResponseDto = Schema.Struct({
  hasTimer: Schema.Boolean,
  windowStatus: Schema.Literals(["OPEN", "WAITING", "OVERDUE", "NONE"]),
  minSpawnTime: Schema.Union([
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
    Schema.Null,
  ]),
  maxSpawnTime: Schema.Union([
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
    Schema.Null,
  ]),
  overdueMs: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
}).annotate({ identifier: "HeroRespawnConfigResponseDto" });

export type CloseRespawnWindowDto = {
  readonly createNewWindow?: boolean;
  readonly newMinSpawnTime?: string;
  readonly newMaxSpawnTime?: string;
};

export const CloseRespawnWindowDto = Schema.Struct({
  createNewWindow: Schema.optionalKey(Schema.Boolean),
  newMinSpawnTime: Schema.optionalKey(
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
  newMaxSpawnTime: Schema.optionalKey(
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

export type OpenRespawnWindowDto = {
  readonly minSpawnTime: string;
  readonly maxSpawnTime: string;
};

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

export type PinnedEventResponseDto = {
  readonly pinnedAt: string;
  readonly event: {
    readonly id: string;
    readonly guildId: string;
    readonly name: string;
    readonly world: string;
    readonly active: boolean;
    readonly startsAt: string | null;
    readonly endsAt: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly heroNpcs: ReadonlyArray<{
      readonly id: string;
      readonly npcId: number | null;
      readonly npcName: string;
      readonly npcIcon: string | null;
      readonly npcLvl: number | null;
    }>;
  };
};

export const PinnedEventResponseDto = Schema.Struct({
  pinnedAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  event: Schema.Struct({
    id: Schema.String,
    guildId: Schema.String,
    name: Schema.String,
    world: Schema.String,
    active: Schema.Boolean,
    startsAt: Schema.Union([
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
      Schema.Null,
    ]),
    endsAt: Schema.Union([
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
      Schema.Null,
    ]),
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
    heroNpcs: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        npcId: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        npcLvl: Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
      }),
    ),
  }),
}).annotate({ identifier: "PinnedEventResponseDto" });

const __recursive_EventMutationResponseDto__schema0 = Schema.Union([
  Schema.Union([
    Schema.String,
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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

export type ListEventsPathParams = { readonly guildId: string };

export const ListEventsPathParams = Schema.Struct({ guildId: Schema.String });

export type ListEventsQuery = {
  readonly world?: string;
  readonly activeOnly?: string;
};

export const ListEventsQuery = Schema.Struct({
  world: Schema.optionalKey(Schema.String),
  activeOnly: Schema.optionalKey(Schema.String),
});

export type ListEvents200 = ReadonlyArray<EventListItemResponseDto>;

export const ListEvents200 = Schema.Array(EventListItemResponseDto);

export type CreateEventPathParams = { readonly guildId: string };

export const CreateEventPathParams = Schema.Struct({ guildId: Schema.String });

export type CreateEventRequestJson = CreateEventDto;

export const CreateEventRequestJson = CreateEventDto;

export type CreateEvent201 = EventMutationResponseDto;

export const CreateEvent201 = EventMutationResponseDto;

export type ShowEventPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const ShowEventPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ShowEvent200 = EventOverviewResponseDto;

export const ShowEvent200 = EventOverviewResponseDto;

export type DeleteEventPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const DeleteEventPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type DeleteEvent200 = SuccessResponseDto_Output;

export const DeleteEvent200 = SuccessResponseDto_Output;

export type UpdateEventPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const UpdateEventPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type UpdateEventRequestJson = UpdateEventDto;

export const UpdateEventRequestJson = UpdateEventDto;

export type UpdateEvent200 = EventMutationResponseDto;

export const UpdateEvent200 = EventMutationResponseDto;

export type ShowEventOverviewPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const ShowEventOverviewPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ShowEventOverview200 = EventOverviewResponseDto;

export const ShowEventOverview200 = EventOverviewResponseDto;

export type ShowEventWrappedPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const ShowEventWrappedPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ShowEventWrapped200 = EventWrappedApiResponseDto_Output;

export const ShowEventWrapped200 = EventWrappedApiResponseDto_Output;

export type ListEventMapsPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const ListEventMapsPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ListEventMaps200 = EventMapsResponseDto_Output;

export const ListEventMaps200 = EventMapsResponseDto_Output;

export type RecalculateEventPointsPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const RecalculateEventPointsPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type RecalculateEventPoints200 = SuccessResponseDto_Output;

export const RecalculateEventPoints200 = SuccessResponseDto_Output;

export type EventsAssignmentControllerAssignMemberPathParams = {
  readonly eventId: string;
  readonly mapId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerAssignMemberPathParams = Schema.Struct({
  eventId: Schema.String,
  mapId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerAssignMemberRequestJson = AssignMemberDto;

export const EventsAssignmentControllerAssignMemberRequestJson =
  AssignMemberDto;

export type EventsAssignmentControllerUnassignMemberPathParams = {
  readonly eventId: string;
  readonly mapId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerUnassignMemberPathParams = Schema.Struct(
  { eventId: Schema.String, mapId: Schema.String, guildId: Schema.String },
);

export type EventsAssignmentControllerUnassignMemberQuery = {
  readonly memberId?: string;
};

export const EventsAssignmentControllerUnassignMemberQuery = Schema.Struct({
  memberId: Schema.optionalKey(Schema.String),
});

export type EventsAssignmentControllerSelfAssignMemberPathParams = {
  readonly eventId: string;
  readonly mapId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerSelfAssignMemberPathParams =
  Schema.Struct({
    eventId: Schema.String,
    mapId: Schema.String,
    guildId: Schema.String,
  });

export type EventsAssignmentControllerSelfUnassignMemberPathParams = {
  readonly eventId: string;
  readonly mapId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerSelfUnassignMemberPathParams =
  Schema.Struct({
    eventId: Schema.String,
    mapId: Schema.String,
    guildId: Schema.String,
  });

export type EventsAssignmentControllerAddHeroPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerAddHeroPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerAddHeroRequestJson = CreateHeroDto;

export const EventsAssignmentControllerAddHeroRequestJson = CreateHeroDto;

export type EventsAssignmentControllerDeleteHeroPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerDeleteHeroPathParams = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerUpdateHeroPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerUpdateHeroPathParams = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerUpdateHeroRequestJson = UpdateHeroDto;

export const EventsAssignmentControllerUpdateHeroRequestJson = UpdateHeroDto;

export type EventsAssignmentControllerAddMapPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerAddMapPathParams = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerAddMapRequestJson = CreateMapDto;

export const EventsAssignmentControllerAddMapRequestJson = CreateMapDto;

export type EventsAssignmentControllerAddMap201 = EventMapResponseDto_Output;

export const EventsAssignmentControllerAddMap201 = EventMapResponseDto_Output;

export type EventsAssignmentControllerDeleteMapPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly mapId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerDeleteMapPathParams = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  mapId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerGetLocationsPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerGetLocationsPathParams = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  guildId: Schema.String,
});

export type EventsAssignmentControllerCreateLocationPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerCreateLocationPathParams = Schema.Struct(
  { eventId: Schema.String, heroId: Schema.String, guildId: Schema.String },
);

export type EventsAssignmentControllerCreateLocationRequestJson =
  CreateLocationDto;

export const EventsAssignmentControllerCreateLocationRequestJson =
  CreateLocationDto;

export type EventsAssignmentControllerDeleteLocationPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly locationId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerDeleteLocationPathParams = Schema.Struct(
  {
    eventId: Schema.String,
    heroId: Schema.String,
    locationId: Schema.String,
    guildId: Schema.String,
  },
);

export type EventsAssignmentControllerUpdateLocationPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly locationId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerUpdateLocationPathParams = Schema.Struct(
  {
    eventId: Schema.String,
    heroId: Schema.String,
    locationId: Schema.String,
    guildId: Schema.String,
  },
);

export type EventsAssignmentControllerUpdateLocationRequestJson =
  UpdateLocationDto;

export const EventsAssignmentControllerUpdateLocationRequestJson =
  UpdateLocationDto;

export type EventsAssignmentControllerReorderLocationsPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerReorderLocationsPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsAssignmentControllerReorderLocationsRequestJson =
  ReorderLocationsDto;

export const EventsAssignmentControllerReorderLocationsRequestJson =
  ReorderLocationsDto;

export type EventsAssignmentControllerAssignMapToLocationPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly mapId: string;
  readonly guildId: string;
};

export const EventsAssignmentControllerAssignMapToLocationPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    mapId: Schema.String,
    guildId: Schema.String,
  });

export type EventsAssignmentControllerAssignMapToLocationRequestJson =
  AssignMapLocationDto;

export const EventsAssignmentControllerAssignMapToLocationRequestJson =
  AssignMapLocationDto;

export type ListPendingParticipationConfirmationsPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const ListPendingParticipationConfirmationsPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ListPendingParticipationConfirmations200 =
  PendingParticipationConfirmationsResponseDto;

export const ListPendingParticipationConfirmations200 =
  PendingParticipationConfirmationsResponseDto;

export type AcknowledgeExpiredParticipationConfirmationsPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const AcknowledgeExpiredParticipationConfirmationsPathParams =
  Schema.Struct({ eventId: Schema.String, guildId: Schema.String });

export type AcknowledgeExpiredParticipationConfirmationsRequestJson =
  AcknowledgeExpiredParticipationConfirmationsDto;

export const AcknowledgeExpiredParticipationConfirmationsRequestJson =
  AcknowledgeExpiredParticipationConfirmationsDto;

export type AcknowledgeExpiredParticipationConfirmations201 =
  AcknowledgeExpiredParticipationConfirmationsResponseDto_Output;

export const AcknowledgeExpiredParticipationConfirmations201 =
  AcknowledgeExpiredParticipationConfirmationsResponseDto_Output;

export type ConfirmParticipationForKillPathParams = {
  readonly eventId: string;
  readonly killId: string;
  readonly guildId: string;
};

export const ConfirmParticipationForKillPathParams = Schema.Struct({
  eventId: Schema.String,
  killId: Schema.String,
  guildId: Schema.String,
});

export type ConfirmParticipationForKill200 =
  ConfirmParticipationForKillResponseDto_Output;

export const ConfirmParticipationForKill200 =
  ConfirmParticipationForKillResponseDto_Output;

export type ListEventRankingPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const ListEventRankingPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ListEventRanking200 = ReadonlyArray<EventRankingEntryResponseDto>;

export const ListEventRanking200 = Schema.Array(EventRankingEntryResponseDto);

export type UpdateRankingPointsPathParams = {
  readonly eventId: string;
  readonly rankingId: string;
  readonly guildId: string;
};

export const UpdateRankingPointsPathParams = Schema.Struct({
  eventId: Schema.String,
  rankingId: Schema.String,
  guildId: Schema.String,
});

export type UpdateRankingPointsRequestJson = UpdateRankingPointsDto;

export const UpdateRankingPointsRequestJson = UpdateRankingPointsDto;

export type ListEventHeroTimersPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const ListEventHeroTimersPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type ListEventHeroTimersQuery = { readonly world: string };

export const ListEventHeroTimersQuery = Schema.Struct({ world: Schema.String });

export type ListEventHeroTimers200 = ReadonlyArray<EventTimerResponseDto>;

export const ListEventHeroTimers200 = Schema.Array(EventTimerResponseDto);

export type EventsRankingControllerGetEventHeroStatsPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const EventsRankingControllerGetEventHeroStatsPathParams = Schema.Struct(
  { eventId: Schema.String, guildId: Schema.String },
);

export type EventsRankingControllerGetEventHeroStats200 =
  ReadonlyArray<EventHeroStatsResponseDto>;

export const EventsRankingControllerGetEventHeroStats200 = Schema.Array(
  EventHeroStatsResponseDto,
);

export type EventsRankingControllerGetEventKillHistoryPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const EventsRankingControllerGetEventKillHistoryPathParams =
  Schema.Struct({ eventId: Schema.String, guildId: Schema.String });

export type EventsRankingControllerGetEventKillHistoryQuery = {
  readonly limit?: string;
  readonly cursor?: string;
  readonly heroId?: string;
};

export const EventsRankingControllerGetEventKillHistoryQuery = Schema.Struct({
  limit: Schema.optionalKey(Schema.String),
  cursor: Schema.optionalKey(Schema.String),
  heroId: Schema.optionalKey(Schema.String),
});

export type EventsRankingControllerGetEventKillHistory200 =
  EventKillHistoryResponseDto;

export const EventsRankingControllerGetEventKillHistory200 =
  EventKillHistoryResponseDto;

export type EventsRankingControllerGetMemberKillHistoryPathParams = {
  readonly eventId: string;
  readonly memberId: string;
  readonly guildId: string;
};

export const EventsRankingControllerGetMemberKillHistoryPathParams =
  Schema.Struct({
    eventId: Schema.String,
    memberId: Schema.String,
    guildId: Schema.String,
  });

export type EventsRankingControllerGetMemberKillHistoryQuery = {
  readonly limit?: string;
  readonly cursor?: string;
  readonly heroId?: string;
};

export const EventsRankingControllerGetMemberKillHistoryQuery = Schema.Struct({
  limit: Schema.optionalKey(Schema.String),
  cursor: Schema.optionalKey(Schema.String),
  heroId: Schema.optionalKey(Schema.String),
});

export type EventsRankingControllerGetMemberKillHistory200 =
  EventMemberKillHistoryResponseDto;

export const EventsRankingControllerGetMemberKillHistory200 =
  EventMemberKillHistoryResponseDto;

export type EventsRankingControllerGetHeroKillHistoryPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsRankingControllerGetHeroKillHistoryPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsRankingControllerGetHeroKillHistoryQuery = {
  readonly limit?: string;
  readonly cursor?: string;
};

export const EventsRankingControllerGetHeroKillHistoryQuery = Schema.Struct({
  limit: Schema.optionalKey(Schema.String),
  cursor: Schema.optionalKey(Schema.String),
});

export type EventsRankingControllerGetHeroKillHistory200 =
  EventKillHistoryResponseDto;

export const EventsRankingControllerGetHeroKillHistory200 =
  EventKillHistoryResponseDto;

export type EventsRankingControllerGetKillDetailPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly killId: string;
  readonly guildId: string;
};

export const EventsRankingControllerGetKillDetailPathParams = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  killId: Schema.String,
  guildId: Schema.String,
});

export type EventsRankingControllerGetKillDetail200 = KillDetailResponseDto;

export const EventsRankingControllerGetKillDetail200 = KillDetailResponseDto;

export type EventsRankingControllerUpdateKillPointPathParams = {
  readonly eventId: string;
  readonly killId: string;
  readonly killPointId: string;
  readonly guildId: string;
};

export const EventsRankingControllerUpdateKillPointPathParams = Schema.Struct({
  eventId: Schema.String,
  killId: Schema.String,
  killPointId: Schema.String,
  guildId: Schema.String,
});

export type EventsRankingControllerUpdateKillPointRequestJson =
  UpdateKillPointDto;

export const EventsRankingControllerUpdateKillPointRequestJson =
  UpdateKillPointDto;

export type EventsMonitoringControllerGetCoordinationPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const EventsMonitoringControllerGetCoordinationPathParams =
  Schema.Struct({ eventId: Schema.String, guildId: Schema.String });

export type EventsMonitoringControllerGetCoordination200 =
  EventCoordinationResponseDto;

export const EventsMonitoringControllerGetCoordination200 =
  EventCoordinationResponseDto;

export type EventsMonitoringControllerGetKillTimelineDataPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly killId: string;
  readonly guildId: string;
};

export const EventsMonitoringControllerGetKillTimelineDataPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    killId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetKillTimelineData200 =
  ReadonlyArray<KillTimelineMapResponseDto>;

export const EventsMonitoringControllerGetKillTimelineData200 = Schema.Array(
  KillTimelineMapResponseDto,
);

export type EventsMonitoringControllerGetHeroCoverageGapsPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsMonitoringControllerGetHeroCoverageGapsPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetHeroCoverageGaps200 =
  ReadonlyArray<HeroCoverageGapResponseDto>;

export const EventsMonitoringControllerGetHeroCoverageGaps200 = Schema.Array(
  HeroCoverageGapResponseDto,
);

export type EventsMonitoringControllerGetMapCoverageGapsPathParams = {
  readonly eventId: string;
  readonly mapId: string;
  readonly guildId: string;
};

export const EventsMonitoringControllerGetMapCoverageGapsPathParams =
  Schema.Struct({
    eventId: Schema.String,
    mapId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetMapCoverageGaps200 =
  ReadonlyArray<CoverageGapResponseDto>;

export const EventsMonitoringControllerGetMapCoverageGaps200 = Schema.Array(
  CoverageGapResponseDto,
);

export type EventsMonitoringControllerGetActiveGapForMapPathParams = {
  readonly eventId: string;
  readonly mapId: string;
  readonly guildId: string;
};

export const EventsMonitoringControllerGetActiveGapForMapPathParams =
  Schema.Struct({
    eventId: Schema.String,
    mapId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetActiveGapForMap200 =
  NullableCoverageGapResponseDto;

export const EventsMonitoringControllerGetActiveGapForMap200 =
  NullableCoverageGapResponseDto;

export type EventsMonitoringControllerGetActiveGapsForHeroPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsMonitoringControllerGetActiveGapsForHeroPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetActiveGapsForHero200 =
  ReadonlyArray<CoverageGapResponseDto>;

export const EventsMonitoringControllerGetActiveGapsForHero200 = Schema.Array(
  CoverageGapResponseDto,
);

export type EventsMonitoringControllerGetHeroPresenceStatsPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsMonitoringControllerGetHeroPresenceStatsPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetHeroPresenceStats200 =
  HeroPresenceStatsResponseDto;

export const EventsMonitoringControllerGetHeroPresenceStats200 =
  HeroPresenceStatsResponseDto;

export type EventsMonitoringControllerGetHeroRespawnConfigPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsMonitoringControllerGetHeroRespawnConfigPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerGetHeroRespawnConfig200 =
  HeroRespawnConfigResponseDto;

export const EventsMonitoringControllerGetHeroRespawnConfig200 =
  HeroRespawnConfigResponseDto;

export type EventsMonitoringControllerCloseRespawnWindowPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsMonitoringControllerCloseRespawnWindowPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerCloseRespawnWindowRequestJson =
  CloseRespawnWindowDto;

export const EventsMonitoringControllerCloseRespawnWindowRequestJson =
  CloseRespawnWindowDto;

export type EventsMonitoringControllerOpenRespawnWindowPathParams = {
  readonly eventId: string;
  readonly heroId: string;
  readonly guildId: string;
};

export const EventsMonitoringControllerOpenRespawnWindowPathParams =
  Schema.Struct({
    eventId: Schema.String,
    heroId: Schema.String,
    guildId: Schema.String,
  });

export type EventsMonitoringControllerOpenRespawnWindowRequestJson =
  OpenRespawnWindowDto;

export const EventsMonitoringControllerOpenRespawnWindowRequestJson =
  OpenRespawnWindowDto;

export type ListPinnedEventsPathParams = { readonly guildId: string };

export const ListPinnedEventsPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ListPinnedEvents200 = ReadonlyArray<PinnedEventResponseDto>;

export const ListPinnedEvents200 = Schema.Array(PinnedEventResponseDto);

export type PinEventPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const PinEventPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type PinEvent200 = PinnedEventResponseDto;

export const PinEvent200 = PinnedEventResponseDto;

export type UnpinEventPathParams = {
  readonly eventId: string;
  readonly guildId: string;
};

export const UnpinEventPathParams = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});
