/** Shared input and output schemas for the sound-settings feature. */
import * as Schema from "effect/Schema";
import {
  DateTimeString,
  FiniteNumber,
  JsonValue,
} from "#src/contracts/scalars";
const SoundConfiguration = JsonValue.annotate({
  identifier: "SoundSettingsResponseDto__schema0",
});

export const SoundSettingsResponse = Schema.Struct({
  userId: Schema.String,
  masterVolume: FiniteNumber,
  notificationsVolume: FiniteNumber,
  detectorVolume: FiniteNumber,
  timersVolume: FiniteNumber,
  pingsVolume: FiniteNumber,
  notificationsConfig: SoundConfiguration,
  detectorConfig: SoundConfiguration,
  timersConfig: SoundConfiguration,
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
}).annotate({ identifier: "SoundSettingsResponseDto" });
export type SoundSettingsResponse = typeof SoundSettingsResponse.Type;
const SoundVolume = FiniteNumber.check(
  Schema.isGreaterThanOrEqualTo(0).annotate({
    expected: "a value greater than or equal to 0",
  }),
).check(
  Schema.isLessThanOrEqualTo(1).annotate({
    expected: "a value less than or equal to 1",
  }),
);

const SoundUpdate = Schema.Struct({
  volume: Schema.optionalKey(SoundVolume),
  soundUrl: Schema.optionalKey(
    Schema.Union([
      Schema.Literal(""),
      Schema.String.annotate({ format: "uri" }),
    ]),
  ),
});
const SoundCategoryUpdates = Schema.Struct({
  ELITE2: Schema.optionalKey(SoundUpdate),
  HERO: Schema.optionalKey(SoundUpdate),
  TITAN: Schema.optionalKey(SoundUpdate),
  COLOSSUS: Schema.optionalKey(SoundUpdate),
  message: Schema.optionalKey(SoundUpdate),
});

export const UpdateSoundSettingsRequest = Schema.Struct({
  masterVolume: Schema.optionalKey(SoundVolume),
  notificationsVolume: Schema.optionalKey(SoundVolume),
  detectorVolume: Schema.optionalKey(SoundVolume),
  timersVolume: Schema.optionalKey(SoundVolume),
  pingsVolume: Schema.optionalKey(SoundVolume),
  notificationsConfig: Schema.optionalKey(SoundCategoryUpdates),
  detectorConfig: Schema.optionalKey(SoundCategoryUpdates),
  timersConfig: Schema.optionalKey(SoundCategoryUpdates),
}).annotate({ identifier: "UpdateSoundSettingsDto" });
export type UpdateSoundSettingsRequest = typeof UpdateSoundSettingsRequest.Type;
