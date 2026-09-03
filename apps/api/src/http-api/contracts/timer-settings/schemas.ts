/** Transport schemas owned by the timer-settings HTTP module. */
import * as Schema from "effect/Schema";
import { DateTimeString, FiniteNumber } from "../scalars.js";

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

export type TimerSettingsResponseDto = typeof TimerSettingsResponseDto.Type;

export const TimerSettingsResponseDto = Schema.Struct({
  userId: Schema.String,
  generalConfig: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  displayConfig: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  customColors: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  timersColors: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  alwaysVisibleExpiredTimers: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  defaultColorNames: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(TimerSettingsResponseDto__schema0),
      Schema.Record(Schema.String, TimerSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  overriddenDefaultColors: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
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
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
}).annotate({ identifier: "TimerSettingsResponseDto" });

export type UpdateTimerSettingsDto = typeof UpdateTimerSettingsDto.Type;

export const UpdateTimerSettingsDto = Schema.Struct({
  generalConfig: Schema.optionalKey(
    Schema.Struct({
      removeTimerAfterMs: Schema.optionalKey(
        FiniteNumber.check(
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
        FiniteNumber.check(
          Schema.isGreaterThanOrEqualTo(8).annotate({
            expected: "a value greater than or equal to 8",
          }),
        ).check(
          Schema.isLessThanOrEqualTo(24).annotate({
            expected: "a value less than or equal to 24",
          }),
        ),
      ),
      minColumnWidth: Schema.optionalKey(
        FiniteNumber.check(
          Schema.isGreaterThanOrEqualTo(50).annotate({
            expected: "a value greater than or equal to 50",
          }),
        ).check(
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

export type GuildTimerSettingsResponseDto =
  typeof GuildTimerSettingsResponseDto.Type;

export const GuildTimerSettingsResponseDto = Schema.Struct({
  userId: Schema.String,
  guildId: Schema.String,
  hiddenTimers: Schema.Array(Schema.String),
  pinnedTimers: Schema.Array(Schema.String),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
}).annotate({ identifier: "GuildTimerSettingsResponseDto" });

export type UpdateGuildTimerSettingsDto =
  typeof UpdateGuildTimerSettingsDto.Type;

export const UpdateGuildTimerSettingsDto = Schema.Struct({
  hiddenTimers: Schema.optionalKey(Schema.Array(Schema.String)),
  pinnedTimers: Schema.optionalKey(Schema.Array(Schema.String)),
}).annotate({ identifier: "UpdateGuildTimerSettingsDto" });

export type MigrateTimerSettingsDto = typeof MigrateTimerSettingsDto.Type;

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
          FiniteNumber,
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
  typeof TimerSettingsControllerGetGlobalSettings200.Type;

export const TimerSettingsControllerGetGlobalSettings200 =
  TimerSettingsResponseDto;

export type TimerSettingsControllerUpdateGlobalSettingsRequestJson =
  typeof TimerSettingsControllerUpdateGlobalSettingsRequestJson.Type;

export const TimerSettingsControllerUpdateGlobalSettingsRequestJson =
  UpdateTimerSettingsDto;

export type TimerSettingsControllerUpdateGlobalSettings200 =
  typeof TimerSettingsControllerUpdateGlobalSettings200.Type;

export const TimerSettingsControllerUpdateGlobalSettings200 =
  TimerSettingsResponseDto;

export type TimerSettingsControllerGetGuildSettingsPathParams =
  typeof TimerSettingsControllerGetGuildSettingsPathParams.Type;

export const TimerSettingsControllerGetGuildSettingsPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type TimerSettingsControllerGetGuildSettings200 =
  typeof TimerSettingsControllerGetGuildSettings200.Type;

export const TimerSettingsControllerGetGuildSettings200 =
  GuildTimerSettingsResponseDto;

export type TimerSettingsControllerUpdateGuildSettingsPathParams =
  typeof TimerSettingsControllerUpdateGuildSettingsPathParams.Type;

export const TimerSettingsControllerUpdateGuildSettingsPathParams =
  Schema.Struct({
    guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  });

export type TimerSettingsControllerUpdateGuildSettingsRequestJson =
  typeof TimerSettingsControllerUpdateGuildSettingsRequestJson.Type;

export const TimerSettingsControllerUpdateGuildSettingsRequestJson =
  UpdateGuildTimerSettingsDto;

export type TimerSettingsControllerUpdateGuildSettings200 =
  typeof TimerSettingsControllerUpdateGuildSettings200.Type;

export const TimerSettingsControllerUpdateGuildSettings200 =
  GuildTimerSettingsResponseDto;

export type TimerSettingsControllerMigrateSettingsRequestJson =
  typeof TimerSettingsControllerMigrateSettingsRequestJson.Type;

export const TimerSettingsControllerMigrateSettingsRequestJson =
  MigrateTimerSettingsDto;
