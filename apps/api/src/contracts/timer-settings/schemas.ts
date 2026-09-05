/** Shared input and output schemas for the timer-settings feature. */
import * as Schema from "effect/Schema";
import {
  DateTimeString,
  FiniteNumber,
  JsonValue,
} from "@lootlog/schema/http-scalars";
const TimerConfiguration = JsonValue.annotate({
  identifier: "TimerSettingsResponseDto__schema0",
});

export const TimerSettingsResponse = Schema.Struct({
  userId: Schema.String,
  generalConfig: TimerConfiguration,
  displayConfig: TimerConfiguration,
  customColors: TimerConfiguration,
  timersColors: TimerConfiguration,
  alwaysVisibleExpiredTimers: TimerConfiguration,
  defaultColorNames: TimerConfiguration,
  overriddenDefaultColors: TimerConfiguration,
  hiddenDefaultColors: Schema.Array(Schema.String),
  timerFiltersEnabled: Schema.Boolean,
  colorFiltersEnabled: Schema.Boolean,
  timersSortOrder: Schema.Literals(["asc", "desc"]),
  syncEnabled: Schema.Boolean,
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
}).annotate({ identifier: "TimerSettingsResponseDto" });
export type TimerSettingsResponse = typeof TimerSettingsResponse.Type;

export const UpdateTimerSettingsRequest = Schema.Struct({
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
export type UpdateTimerSettingsRequest = typeof UpdateTimerSettingsRequest.Type;

export const OrganizationTimerSettingsResponse = Schema.Struct({
  userId: Schema.String,
  guildId: Schema.String,
  hiddenTimers: Schema.Array(Schema.String),
  pinnedTimers: Schema.Array(Schema.String),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
}).annotate({ identifier: "GuildTimerSettingsResponseDto" });
export type OrganizationTimerSettingsResponse =
  typeof OrganizationTimerSettingsResponse.Type;

export const UpdateOrganizationTimerSettingsRequest = Schema.Struct({
  hiddenTimers: Schema.optionalKey(Schema.Array(Schema.String)),
  pinnedTimers: Schema.optionalKey(Schema.Array(Schema.String)),
}).annotate({ identifier: "UpdateGuildTimerSettingsDto" });
export type UpdateOrganizationTimerSettingsRequest =
  typeof UpdateOrganizationTimerSettingsRequest.Type;

export const MigrateTimerSettingsRequest = Schema.Struct({
  localData: Schema.Record(Schema.String, JsonValue),
  conflictResolution: Schema.optionalKey(
    Schema.Literals(["local", "remote", "merge"]),
  ),
}).annotate({ identifier: "MigrateTimerSettingsDto" });
export type MigrateTimerSettingsRequest =
  typeof MigrateTimerSettingsRequest.Type;

export const OrganizationTimerSettingsParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});
export type OrganizationTimerSettingsParams =
  typeof OrganizationTimerSettingsParams.Type;
