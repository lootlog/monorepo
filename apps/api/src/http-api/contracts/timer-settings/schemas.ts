/** Transport schemas owned by the timer-settings HTTP module. */
import * as Schema from "effect/Schema";

export type TimerSettingsResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<TimerSettingsResponseDto__schema0>
      | { readonly [x: string]: TimerSettingsResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<TimerSettingsResponseDto__schema0>
        | { readonly [x: string]: TimerSettingsResponseDto__schema0 }
        | null;
    }
  | null;

export const TimerSettingsResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<TimerSettingsResponseDto__schema0> =>
    __recursive_TimerSettingsResponseDto__schema0,
);

export type TimerSettingsResponseDto = {
  readonly userId: string;
  readonly generalConfig:
    | string
    | number
    | boolean
    | ReadonlyArray<TimerSettingsResponseDto__schema0>
    | { readonly [x: string]: TimerSettingsResponseDto__schema0 }
    | null;
  readonly displayConfig:
    | string
    | number
    | boolean
    | ReadonlyArray<TimerSettingsResponseDto__schema0>
    | { readonly [x: string]: TimerSettingsResponseDto__schema0 }
    | null;
  readonly customColors:
    | string
    | number
    | boolean
    | ReadonlyArray<TimerSettingsResponseDto__schema0>
    | { readonly [x: string]: TimerSettingsResponseDto__schema0 }
    | null;
  readonly timersColors:
    | string
    | number
    | boolean
    | ReadonlyArray<TimerSettingsResponseDto__schema0>
    | { readonly [x: string]: TimerSettingsResponseDto__schema0 }
    | null;
  readonly alwaysVisibleExpiredTimers:
    | string
    | number
    | boolean
    | ReadonlyArray<TimerSettingsResponseDto__schema0>
    | { readonly [x: string]: TimerSettingsResponseDto__schema0 }
    | null;
  readonly defaultColorNames:
    | string
    | number
    | boolean
    | ReadonlyArray<TimerSettingsResponseDto__schema0>
    | { readonly [x: string]: TimerSettingsResponseDto__schema0 }
    | null;
  readonly overriddenDefaultColors:
    | string
    | number
    | boolean
    | ReadonlyArray<TimerSettingsResponseDto__schema0>
    | { readonly [x: string]: TimerSettingsResponseDto__schema0 }
    | null;
  readonly hiddenDefaultColors: ReadonlyArray<string>;
  readonly timerFiltersEnabled: boolean;
  readonly colorFiltersEnabled: boolean;
  readonly timersSortOrder: "asc" | "desc";
  readonly syncEnabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const TimerSettingsResponseDto = Schema.Struct({
  userId: Schema.String,
  generalConfig: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  displayConfig: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  customColors: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  timersColors: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  alwaysVisibleExpiredTimers: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  defaultColorNames: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  overriddenDefaultColors: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  hiddenDefaultColors: Schema.Array(Schema.String),
  timerFiltersEnabled: Schema.Boolean,
  colorFiltersEnabled: Schema.Boolean,
  timersSortOrder: Schema.Literals(["asc", "desc"]),
  syncEnabled: Schema.Boolean,
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
}).annotate({ identifier: "TimerSettingsResponseDto" });

export type UpdateTimerSettingsDto = {
  readonly generalConfig?: {
    readonly removeTimerAfterMs?: number;
    readonly compactView?: boolean;
    readonly timersGrouping?: boolean;
    readonly timersUnderBag?: boolean;
    readonly countdownMode?: "min" | "max";
  };
  readonly displayConfig?: {
    readonly showType?: boolean;
    readonly showLevel?: boolean;
    readonly fontSize?: number;
    readonly minColumnWidth?: number;
    readonly singleTimerDisplayMode?: "column" | "row";
  };
  readonly customColors?: {
    readonly [x: string]: {
      readonly id: string;
      readonly name: string;
      readonly borderColor: string;
      readonly backgroundColor: string;
    };
  };
  readonly timersColors?: { readonly [x: string]: string };
  readonly alwaysVisibleExpiredTimers?: {
    readonly [x: string]: ReadonlyArray<string>;
  };
  readonly defaultColorNames?: { readonly [x: string]: string };
  readonly overriddenDefaultColors?: {
    readonly [x: string]: {
      readonly borderColor: string;
      readonly backgroundColor: string;
    };
  };
  readonly hiddenDefaultColors?: ReadonlyArray<string>;
  readonly timerFiltersEnabled?: boolean;
  readonly colorFiltersEnabled?: boolean;
  readonly timersSortOrder?: "asc" | "desc";
  readonly syncEnabled?: boolean;
};

export const UpdateTimerSettingsDto = Schema.Struct({
  generalConfig: Schema.optionalKey(
    Schema.Struct({
      removeTimerAfterMs: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ).check(
          Schema.isGreaterThanOrEqualTo(0).annotate({
            expected: "a value greater than or equal to 0",
          }),
        ),
      ),
      compactView: Schema.optionalKey(Schema.Boolean),
      timersGrouping: Schema.optionalKey(Schema.Boolean),
      timersUnderBag: Schema.optionalKey(Schema.Boolean),
      countdownMode: Schema.optionalKey(Schema.Literals(["min", "max"])),
    }),
  ),
  displayConfig: Schema.optionalKey(
    Schema.Struct({
      showType: Schema.optionalKey(Schema.Boolean),
      showLevel: Schema.optionalKey(Schema.Boolean),
      fontSize: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(8).annotate({
              expected: "a value greater than or equal to 8",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(24).annotate({
              expected: "a value less than or equal to 24",
            }),
          ),
      ),
      minColumnWidth: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(50).annotate({
              expected: "a value greater than or equal to 50",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(500).annotate({
              expected: "a value less than or equal to 500",
            }),
          ),
      ),
      singleTimerDisplayMode: Schema.optionalKey(
        Schema.Literals(["column", "row"]),
      ),
    }),
  ),
  customColors: Schema.optionalKey(
    Schema.Record(
      Schema.String,
      Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        borderColor: Schema.String,
        backgroundColor: Schema.String,
      }),
    ),
  ),
  timersColors: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  alwaysVisibleExpiredTimers: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.Array(Schema.String)),
  ),
  defaultColorNames: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String),
  ),
  overriddenDefaultColors: Schema.optionalKey(
    Schema.Record(
      Schema.String,
      Schema.Struct({
        borderColor: Schema.String,
        backgroundColor: Schema.String,
      }),
    ),
  ),
  hiddenDefaultColors: Schema.optionalKey(Schema.Array(Schema.String)),
  timerFiltersEnabled: Schema.optionalKey(Schema.Boolean),
  colorFiltersEnabled: Schema.optionalKey(Schema.Boolean),
  timersSortOrder: Schema.optionalKey(Schema.Literals(["asc", "desc"])),
  syncEnabled: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "UpdateTimerSettingsDto" });

export type GuildTimerSettingsResponseDto = {
  readonly userId: string;
  readonly guildId: string;
  readonly hiddenTimers: ReadonlyArray<string>;
  readonly pinnedTimers: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const GuildTimerSettingsResponseDto = Schema.Struct({
  userId: Schema.String,
  guildId: Schema.String,
  hiddenTimers: Schema.Array(Schema.String),
  pinnedTimers: Schema.Array(Schema.String),
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
}).annotate({ identifier: "GuildTimerSettingsResponseDto" });

export type UpdateGuildTimerSettingsDto = {
  readonly hiddenTimers?: ReadonlyArray<string>;
  readonly pinnedTimers?: ReadonlyArray<string>;
};

export const UpdateGuildTimerSettingsDto = Schema.Struct({
  hiddenTimers: Schema.optionalKey(Schema.Array(Schema.String)),
  pinnedTimers: Schema.optionalKey(Schema.Array(Schema.String)),
}).annotate({ identifier: "UpdateGuildTimerSettingsDto" });

export type MigrateTimerSettingsDto = {
  readonly localData: { readonly [x: string]: Schema.Json };
  readonly conflictResolution?: "local" | "remote" | "merge";
};

export const MigrateTimerSettingsDto = Schema.Struct({
  localData: Schema.Record(
    Schema.String,
    Schema.Json.annotate({ expected: "JSON value" }),
  ),
  conflictResolution: Schema.optionalKey(
    Schema.Literals(["local", "remote", "merge"]),
  ),
}).annotate({ identifier: "MigrateTimerSettingsDto" });

// recursive definitions
const __recursive_TimerSettingsResponseDto__schema0 = Schema.Union([
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
              (): Schema.Codec<TimerSettingsResponseDto__schema0> =>
                TimerSettingsResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<TimerSettingsResponseDto__schema0> =>
                TimerSettingsResponseDto__schema0,
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
              (): Schema.Codec<TimerSettingsResponseDto__schema0> =>
                TimerSettingsResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<TimerSettingsResponseDto__schema0> =>
                TimerSettingsResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "TimerSettingsResponseDto__schema0" });

export type TimerSettingsControllerGetGlobalSettings200 =
  TimerSettingsResponseDto;

export const TimerSettingsControllerGetGlobalSettings200 =
  TimerSettingsResponseDto;

export type TimerSettingsControllerUpdateGlobalSettingsRequestJson =
  UpdateTimerSettingsDto;

export const TimerSettingsControllerUpdateGlobalSettingsRequestJson =
  UpdateTimerSettingsDto;

export type TimerSettingsControllerUpdateGlobalSettings200 =
  TimerSettingsResponseDto;

export const TimerSettingsControllerUpdateGlobalSettings200 =
  TimerSettingsResponseDto;

export type TimerSettingsControllerGetGuildSettingsPathParams = {
  readonly guildId: string;
};

export const TimerSettingsControllerGetGuildSettingsPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type TimerSettingsControllerGetGuildSettings200 =
  GuildTimerSettingsResponseDto;

export const TimerSettingsControllerGetGuildSettings200 =
  GuildTimerSettingsResponseDto;

export type TimerSettingsControllerUpdateGuildSettingsPathParams = {
  readonly guildId: string;
};

export const TimerSettingsControllerUpdateGuildSettingsPathParams =
  Schema.Struct({
    guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  });

export type TimerSettingsControllerUpdateGuildSettingsRequestJson =
  UpdateGuildTimerSettingsDto;

export const TimerSettingsControllerUpdateGuildSettingsRequestJson =
  UpdateGuildTimerSettingsDto;

export type TimerSettingsControllerUpdateGuildSettings200 =
  GuildTimerSettingsResponseDto;

export const TimerSettingsControllerUpdateGuildSettings200 =
  GuildTimerSettingsResponseDto;

export type TimerSettingsControllerMigrateSettingsRequestJson =
  MigrateTimerSettingsDto;

export const TimerSettingsControllerMigrateSettingsRequestJson =
  MigrateTimerSettingsDto;
