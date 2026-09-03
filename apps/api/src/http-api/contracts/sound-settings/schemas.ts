/** Transport schemas owned by the sound-settings HTTP module. */
import * as Schema from "effect/Schema";

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

export type SoundSettingsResponseDto = {
  readonly userId: string;
  readonly masterVolume: number;
  readonly notificationsVolume: number;
  readonly detectorVolume: number;
  readonly timersVolume: number;
  readonly pingsVolume: number;
  readonly notificationsConfig:
    | string
    | number
    | boolean
    | ReadonlyArray<SoundSettingsResponseDto__schema0>
    | { readonly [x: string]: SoundSettingsResponseDto__schema0 }
    | null;
  readonly detectorConfig:
    | string
    | number
    | boolean
    | ReadonlyArray<SoundSettingsResponseDto__schema0>
    | { readonly [x: string]: SoundSettingsResponseDto__schema0 }
    | null;
  readonly timersConfig:
    | string
    | number
    | boolean
    | ReadonlyArray<SoundSettingsResponseDto__schema0>
    | { readonly [x: string]: SoundSettingsResponseDto__schema0 }
    | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const SoundSettingsResponseDto = Schema.Struct({
  userId: Schema.String,
  masterVolume: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  notificationsVolume: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  detectorVolume: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  timersVolume: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  pingsVolume: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  notificationsConfig: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(SoundSettingsResponseDto__schema0),
      Schema.Record(Schema.String, SoundSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  detectorConfig: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(SoundSettingsResponseDto__schema0),
      Schema.Record(Schema.String, SoundSettingsResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  timersConfig: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(SoundSettingsResponseDto__schema0),
      Schema.Record(Schema.String, SoundSettingsResponseDto__schema0),
    ]),
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
}).annotate({ identifier: "SoundSettingsResponseDto" });

export type UpdateSoundSettingsDto = {
  readonly masterVolume?: number;
  readonly notificationsVolume?: number;
  readonly detectorVolume?: number;
  readonly timersVolume?: number;
  readonly pingsVolume?: number;
  readonly notificationsConfig?: {
    readonly ELITE2?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
    readonly HERO?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
    readonly TITAN?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
    readonly COLOSSUS?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
    readonly message?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
  };
  readonly detectorConfig?: {
    readonly ELITE2?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
    readonly HERO?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
    readonly TITAN?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
    readonly COLOSSUS?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
    readonly message?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
  };
  readonly timersConfig?: {
    readonly ELITE2?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
    readonly HERO?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
    readonly TITAN?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
    readonly COLOSSUS?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
    readonly message?: {
      readonly volume?: number;
      readonly soundUrl?: "" | string;
    };
  };
};

export const UpdateSoundSettingsDto = Schema.Struct({
  masterVolume: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(1).annotate({
          expected: "a value less than or equal to 1",
        }),
      ),
  ),
  notificationsVolume: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(1).annotate({
          expected: "a value less than or equal to 1",
        }),
      ),
  ),
  detectorVolume: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(1).annotate({
          expected: "a value less than or equal to 1",
        }),
      ),
  ),
  timersVolume: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(1).annotate({
          expected: "a value less than or equal to 1",
        }),
      ),
  ),
  pingsVolume: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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

export type SoundSettingsControllerGetSettings200 = SoundSettingsResponseDto;

export const SoundSettingsControllerGetSettings200 = SoundSettingsResponseDto;

export type SoundSettingsControllerUpdateSettingsRequestJson =
  UpdateSoundSettingsDto;

export const SoundSettingsControllerUpdateSettingsRequestJson =
  UpdateSoundSettingsDto;

export type SoundSettingsControllerUpdateSettings200 = SoundSettingsResponseDto;

export const SoundSettingsControllerUpdateSettings200 =
  SoundSettingsResponseDto;
