/** Transport schemas owned by the sound-settings HTTP module. */
import * as Schema from "effect/Schema";
import { DateTimeString, FiniteNumber } from "../scalars.js";

export type SoundSettingsResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<SoundSettingsResponseDto__schema0>
      | { readonly [x: string]: SoundSettingsResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<SoundSettingsResponseDto__schema0>
        | { readonly [x: string]: SoundSettingsResponseDto__schema0 }
        | null;
    }
  | null;

export const SoundSettingsResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<SoundSettingsResponseDto__schema0> =>
    __recursive_SoundSettingsResponseDto__schema0,
);

export type SoundSettingsResponseDto = typeof SoundSettingsResponseDto.Type;

export const SoundSettingsResponseDto = Schema.Struct({
  userId: Schema.String,
  masterVolume: FiniteNumber,
  notificationsVolume: FiniteNumber,
  detectorVolume: FiniteNumber,
  timersVolume: FiniteNumber,
  pingsVolume: FiniteNumber,
  notificationsConfig: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(SoundSettingsResponseDto__schema0),
      Schema.Record(Schema.String, SoundSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  detectorConfig: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(SoundSettingsResponseDto__schema0),
      Schema.Record(Schema.String, SoundSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  timersConfig: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(SoundSettingsResponseDto__schema0),
      Schema.Record(Schema.String, SoundSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
}).annotate({ identifier: "SoundSettingsResponseDto" });

export type UpdateSoundSettingsDto = typeof UpdateSoundSettingsDto.Type;

export const UpdateSoundSettingsDto = Schema.Struct({
  masterVolume: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: "a value greater than or equal to 0",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(1).annotate({
        expected: "a value less than or equal to 1",
      }),
    ),
  ),
  notificationsVolume: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: "a value greater than or equal to 0",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(1).annotate({
        expected: "a value less than or equal to 1",
      }),
    ),
  ),
  detectorVolume: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: "a value greater than or equal to 0",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(1).annotate({
        expected: "a value less than or equal to 1",
      }),
    ),
  ),
  timersVolume: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: "a value greater than or equal to 0",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(1).annotate({
        expected: "a value less than or equal to 1",
      }),
    ),
  ),
  pingsVolume: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: "a value greater than or equal to 0",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(1).annotate({
        expected: "a value less than or equal to 1",
      }),
    ),
  ),
  notificationsConfig: Schema.optionalKey(
    Schema.Struct({
      ELITE2: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
      HERO: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
      TITAN: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
      COLOSSUS: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
      message: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
    }),
  ),
  detectorConfig: Schema.optionalKey(
    Schema.Struct({
      ELITE2: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
      HERO: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
      TITAN: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
      COLOSSUS: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
      message: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
    }),
  ),
  timersConfig: Schema.optionalKey(
    Schema.Struct({
      ELITE2: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
      HERO: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
      TITAN: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
      COLOSSUS: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
      message: Schema.optionalKey(
        Schema.Struct({
          volume: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ).check(
              Schema.isLessThanOrEqualTo(1).annotate({
                expected: "a value less than or equal to 1",
              }),
            ),
          ),
          soundUrl: Schema.optionalKey(
            Schema.Union([
              Schema.Literal(""),
              Schema.String.annotate({ format: "uri" }),
            ]),
          ),
        }),
      ),
    }),
  ),
}).annotate({ identifier: "UpdateSoundSettingsDto" });

const __recursive_SoundSettingsResponseDto__schema0 = Schema.Union([
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
              (): Schema.Codec<SoundSettingsResponseDto__schema0> =>
                SoundSettingsResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<SoundSettingsResponseDto__schema0> =>
                SoundSettingsResponseDto__schema0,
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
              (): Schema.Codec<SoundSettingsResponseDto__schema0> =>
                SoundSettingsResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<SoundSettingsResponseDto__schema0> =>
                SoundSettingsResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "SoundSettingsResponseDto__schema0" });

export type SoundSettingsControllerGetSettings200 =
  typeof SoundSettingsControllerGetSettings200.Type;

export const SoundSettingsControllerGetSettings200 = SoundSettingsResponseDto;

export type SoundSettingsControllerUpdateSettingsRequestJson =
  typeof SoundSettingsControllerUpdateSettingsRequestJson.Type;

export const SoundSettingsControllerUpdateSettingsRequestJson =
  UpdateSoundSettingsDto;

export type SoundSettingsControllerUpdateSettings200 =
  typeof SoundSettingsControllerUpdateSettings200.Type;

export const SoundSettingsControllerUpdateSettings200 =
  SoundSettingsResponseDto;
