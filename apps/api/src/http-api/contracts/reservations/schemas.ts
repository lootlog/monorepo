/** Transport schemas owned by the reservations HTTP module. */
import * as Schema from "effect/Schema";

export type ReservationSpotsResponseDto = ReadonlyArray<{
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly images: ReadonlyArray<string>;
  readonly maps: ReadonlyArray<string>;
  readonly isPinned: boolean;
  readonly isAvailableNow: boolean;
  readonly availableUntil: string | null;
  readonly activeReservationCount: number;
  readonly hasPartnerReservations: boolean;
  readonly currentReservation:
    | ({
        readonly id: number;
        readonly spotId: string;
        readonly spotName: string;
        readonly startsAt: string;
        readonly endsAt: string;
        readonly comment: string | null;
        readonly createdAt: string;
        readonly author: {
          readonly displayName: string;
          readonly avatarUrl: string | null;
        };
        readonly sourceOrganization: {
          readonly name: string;
          readonly iconUrl: string | null;
          readonly isCurrent: boolean;
          readonly calendarPath: string;
        };
        readonly isMine: boolean;
        readonly canEdit: boolean;
        readonly canCancel: boolean;
        readonly editingConstraints:
          | ({
              readonly reservationMaxDurationMinutes: number;
              readonly reservationMinDurationMinutes: number;
              readonly reservationTimeGranularityMinutes: number;
              readonly reservationMaxAdvanceDays: number;
            } & { readonly [x: string]: Schema.Json })
          | null;
        readonly reminderMinutesBefore: 0 | 5 | 15 | 30 | null;
      } & { readonly [x: string]: Schema.Json })
    | null;
  readonly nextReservation:
    | ({
        readonly id: number;
        readonly spotId: string;
        readonly spotName: string;
        readonly startsAt: string;
        readonly endsAt: string;
        readonly comment: string | null;
        readonly createdAt: string;
        readonly author: {
          readonly displayName: string;
          readonly avatarUrl: string | null;
        };
        readonly sourceOrganization: {
          readonly name: string;
          readonly iconUrl: string | null;
          readonly isCurrent: boolean;
          readonly calendarPath: string;
        };
        readonly isMine: boolean;
        readonly canEdit: boolean;
        readonly canCancel: boolean;
        readonly editingConstraints:
          | ({
              readonly reservationMaxDurationMinutes: number;
              readonly reservationMinDurationMinutes: number;
              readonly reservationTimeGranularityMinutes: number;
              readonly reservationMaxAdvanceDays: number;
            } & { readonly [x: string]: Schema.Json })
          | null;
        readonly reminderMinutesBefore: 0 | 5 | 15 | 30 | null;
      } & { readonly [x: string]: Schema.Json })
    | null;
}>;

export const ReservationSpotsResponseDto = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    level: Schema.Number.check(
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
    images: Schema.Array(Schema.String),
    maps: Schema.Array(Schema.String),
    isPinned: Schema.Boolean,
    isAvailableNow: Schema.Boolean,
    availableUntil: Schema.Union([
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
    activeReservationCount: Schema.Number.check(
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
    hasPartnerReservations: Schema.Boolean,
    currentReservation: Schema.Union([
      Schema.StructWithRest(
        Schema.Struct({
          id: Schema.Number.check(
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
          spotId: Schema.String,
          spotName: Schema.String,
          startsAt: Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          endsAt: Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          comment: Schema.Union([Schema.String, Schema.Null]),
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
          author: Schema.Struct({
            displayName: Schema.String,
            avatarUrl: Schema.Union([Schema.String, Schema.Null]),
          }),
          sourceOrganization: Schema.Struct({
            name: Schema.String,
            iconUrl: Schema.Union([Schema.String, Schema.Null]),
            isCurrent: Schema.Boolean,
            calendarPath: Schema.String.check(
              Schema.isPattern(new RegExp("^\\/.*")).annotate({
                expected: "a string matching the RegExp ^\\/.*",
              }),
            ),
          }),
          isMine: Schema.Boolean,
          canEdit: Schema.Boolean,
          canCancel: Schema.Boolean,
          editingConstraints: Schema.Union([
            Schema.StructWithRest(
              Schema.Struct({
                reservationMaxDurationMinutes: Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isGreaterThan(0).annotate({
                      expected: "a value greater than 0",
                    }),
                  ),
                reservationMinDurationMinutes: Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isGreaterThan(0).annotate({
                      expected: "a value greater than 0",
                    }),
                  ),
                reservationTimeGranularityMinutes: Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isGreaterThan(0).annotate({
                      expected: "a value greater than 0",
                    }),
                  ),
                reservationMaxAdvanceDays: Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isGreaterThan(0).annotate({
                      expected: "a value greater than 0",
                    }),
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
          reminderMinutesBefore: Schema.Union([
            Schema.Literals([0, 5, 15, 30]),
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
    nextReservation: Schema.Union([
      Schema.StructWithRest(
        Schema.Struct({
          id: Schema.Number.check(
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
          spotId: Schema.String,
          spotName: Schema.String,
          startsAt: Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          endsAt: Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          comment: Schema.Union([Schema.String, Schema.Null]),
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
          author: Schema.Struct({
            displayName: Schema.String,
            avatarUrl: Schema.Union([Schema.String, Schema.Null]),
          }),
          sourceOrganization: Schema.Struct({
            name: Schema.String,
            iconUrl: Schema.Union([Schema.String, Schema.Null]),
            isCurrent: Schema.Boolean,
            calendarPath: Schema.String.check(
              Schema.isPattern(new RegExp("^\\/.*")).annotate({
                expected: "a string matching the RegExp ^\\/.*",
              }),
            ),
          }),
          isMine: Schema.Boolean,
          canEdit: Schema.Boolean,
          canCancel: Schema.Boolean,
          editingConstraints: Schema.Union([
            Schema.StructWithRest(
              Schema.Struct({
                reservationMaxDurationMinutes: Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isGreaterThan(0).annotate({
                      expected: "a value greater than 0",
                    }),
                  ),
                reservationMinDurationMinutes: Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isGreaterThan(0).annotate({
                      expected: "a value greater than 0",
                    }),
                  ),
                reservationTimeGranularityMinutes: Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isGreaterThan(0).annotate({
                      expected: "a value greater than 0",
                    }),
                  ),
                reservationMaxAdvanceDays: Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isGreaterThan(0).annotate({
                      expected: "a value greater than 0",
                    }),
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
          reminderMinutesBefore: Schema.Union([
            Schema.Literals([0, 5, 15, 30]),
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
  }),
).annotate({ identifier: "ReservationSpotsResponseDto" });

export type ReservationWindowResponseDto = {
  readonly items: ReadonlyArray<{
    readonly id: number;
    readonly spotId: string;
    readonly spotName: string;
    readonly startsAt: string;
    readonly endsAt: string;
    readonly comment: string | null;
    readonly createdAt: string;
    readonly author: {
      readonly displayName: string;
      readonly avatarUrl: string | null;
    };
    readonly sourceOrganization: {
      readonly name: string;
      readonly iconUrl: string | null;
      readonly isCurrent: boolean;
      readonly calendarPath: string;
    };
    readonly isMine: boolean;
    readonly canEdit: boolean;
    readonly canCancel: boolean;
    readonly editingConstraints:
      | ({
          readonly reservationMaxDurationMinutes: number;
          readonly reservationMinDurationMinutes: number;
          readonly reservationTimeGranularityMinutes: number;
          readonly reservationMaxAdvanceDays: number;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly reminderMinutesBefore: 0 | 5 | 15 | 30 | null;
  }>;
  readonly window: { readonly from: string; readonly to: string };
};

export const ReservationWindowResponseDto = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.Number.check(
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
      spotId: Schema.String,
      spotName: Schema.String,
      startsAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      endsAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      comment: Schema.Union([Schema.String, Schema.Null]),
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
      author: Schema.Struct({
        displayName: Schema.String,
        avatarUrl: Schema.Union([Schema.String, Schema.Null]),
      }),
      sourceOrganization: Schema.Struct({
        name: Schema.String,
        iconUrl: Schema.Union([Schema.String, Schema.Null]),
        isCurrent: Schema.Boolean,
        calendarPath: Schema.String.check(
          Schema.isPattern(new RegExp("^\\/.*")).annotate({
            expected: "a string matching the RegExp ^\\/.*",
          }),
        ),
      }),
      isMine: Schema.Boolean,
      canEdit: Schema.Boolean,
      canCancel: Schema.Boolean,
      editingConstraints: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            reservationMaxDurationMinutes: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              )
              .check(
                Schema.isGreaterThan(0).annotate({
                  expected: "a value greater than 0",
                }),
              ),
            reservationMinDurationMinutes: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              )
              .check(
                Schema.isGreaterThan(0).annotate({
                  expected: "a value greater than 0",
                }),
              ),
            reservationTimeGranularityMinutes: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              )
              .check(
                Schema.isGreaterThan(0).annotate({
                  expected: "a value greater than 0",
                }),
              ),
            reservationMaxAdvanceDays: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              )
              .check(
                Schema.isGreaterThan(0).annotate({
                  expected: "a value greater than 0",
                }),
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
      reminderMinutesBefore: Schema.Union([
        Schema.Literals([0, 5, 15, 30]),
        Schema.Null,
      ]),
    }),
  ),
  window: Schema.Struct({
    from: Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
    to: Schema.String.annotate({ format: "date-time" }).check(
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
}).annotate({ identifier: "ReservationWindowResponseDto" });

export type CreateReservationDto = {
  readonly startsAt: string;
  readonly endsAt: string;
  readonly comment?: string;
  readonly reminderMinutesBefore?: 0 | 5 | 15 | 30 | null;
};

export const CreateReservationDto = Schema.Struct({
  startsAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
    }),
  ),
  endsAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
    }),
  ),
  comment: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(128).annotate({
        expected: "a value with a length of at most 128",
      }),
    ),
  ),
  reminderMinutesBefore: Schema.optionalKey(
    Schema.Union([Schema.Literals([0, 5, 15, 30]), Schema.Null]),
  ),
}).annotate({ identifier: "CreateReservationDto" });

export type ReservationResponseDto = {
  readonly id: number;
  readonly spotId: string;
  readonly spotName: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly comment: string | null;
  readonly createdAt: string;
  readonly author: {
    readonly displayName: string;
    readonly avatarUrl: string | null;
  };
  readonly sourceOrganization: {
    readonly name: string;
    readonly iconUrl: string | null;
    readonly isCurrent: boolean;
    readonly calendarPath: string;
  };
  readonly isMine: boolean;
  readonly canEdit: boolean;
  readonly canCancel: boolean;
  readonly editingConstraints:
    | ({
        readonly reservationMaxDurationMinutes: number;
        readonly reservationMinDurationMinutes: number;
        readonly reservationTimeGranularityMinutes: number;
        readonly reservationMaxAdvanceDays: number;
      } & { readonly [x: string]: Schema.Json })
    | null;
  readonly reminderMinutesBefore: 0 | 5 | 15 | 30 | null;
};

export const ReservationResponseDto = Schema.Struct({
  id: Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
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
  spotId: Schema.String,
  spotName: Schema.String,
  startsAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  endsAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  comment: Schema.Union([Schema.String, Schema.Null]),
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
  author: Schema.Struct({
    displayName: Schema.String,
    avatarUrl: Schema.Union([Schema.String, Schema.Null]),
  }),
  sourceOrganization: Schema.Struct({
    name: Schema.String,
    iconUrl: Schema.Union([Schema.String, Schema.Null]),
    isCurrent: Schema.Boolean,
    calendarPath: Schema.String.check(
      Schema.isPattern(new RegExp("^\\/.*")).annotate({
        expected: "a string matching the RegExp ^\\/.*",
      }),
    ),
  }),
  isMine: Schema.Boolean,
  canEdit: Schema.Boolean,
  canCancel: Schema.Boolean,
  editingConstraints: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        reservationMaxDurationMinutes: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          )
          .check(
            Schema.isGreaterThan(0).annotate({
              expected: "a value greater than 0",
            }),
          ),
        reservationMinDurationMinutes: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          )
          .check(
            Schema.isGreaterThan(0).annotate({
              expected: "a value greater than 0",
            }),
          ),
        reservationTimeGranularityMinutes: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          )
          .check(
            Schema.isGreaterThan(0).annotate({
              expected: "a value greater than 0",
            }),
          ),
        reservationMaxAdvanceDays: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          )
          .check(
            Schema.isGreaterThan(0).annotate({
              expected: "a value greater than 0",
            }),
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
  reminderMinutesBefore: Schema.Union([
    Schema.Literals([0, 5, 15, 30]),
    Schema.Null,
  ]),
}).annotate({ identifier: "ReservationResponseDto" });

export type MyReservationsResponseDto = {
  readonly items: ReadonlyArray<{
    readonly id: number;
    readonly spotId: string;
    readonly spotName: string;
    readonly startsAt: string;
    readonly endsAt: string;
    readonly comment: string | null;
    readonly createdAt: string;
    readonly author: {
      readonly displayName: string;
      readonly avatarUrl: string | null;
    };
    readonly sourceOrganization: {
      readonly name: string;
      readonly iconUrl: string | null;
      readonly isCurrent: boolean;
      readonly calendarPath: string;
    };
    readonly isMine: boolean;
    readonly canEdit: boolean;
    readonly canCancel: boolean;
    readonly editingConstraints:
      | ({
          readonly reservationMaxDurationMinutes: number;
          readonly reservationMinDurationMinutes: number;
          readonly reservationTimeGranularityMinutes: number;
          readonly reservationMaxAdvanceDays: number;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly reminderMinutesBefore: 0 | 5 | 15 | 30 | null;
  }>;
};

export const MyReservationsResponseDto = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.Number.check(
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
      spotId: Schema.String,
      spotName: Schema.String,
      startsAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      endsAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      comment: Schema.Union([Schema.String, Schema.Null]),
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
      author: Schema.Struct({
        displayName: Schema.String,
        avatarUrl: Schema.Union([Schema.String, Schema.Null]),
      }),
      sourceOrganization: Schema.Struct({
        name: Schema.String,
        iconUrl: Schema.Union([Schema.String, Schema.Null]),
        isCurrent: Schema.Boolean,
        calendarPath: Schema.String.check(
          Schema.isPattern(new RegExp("^\\/.*")).annotate({
            expected: "a string matching the RegExp ^\\/.*",
          }),
        ),
      }),
      isMine: Schema.Boolean,
      canEdit: Schema.Boolean,
      canCancel: Schema.Boolean,
      editingConstraints: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            reservationMaxDurationMinutes: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              )
              .check(
                Schema.isGreaterThan(0).annotate({
                  expected: "a value greater than 0",
                }),
              ),
            reservationMinDurationMinutes: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              )
              .check(
                Schema.isGreaterThan(0).annotate({
                  expected: "a value greater than 0",
                }),
              ),
            reservationTimeGranularityMinutes: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              )
              .check(
                Schema.isGreaterThan(0).annotate({
                  expected: "a value greater than 0",
                }),
              ),
            reservationMaxAdvanceDays: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              )
              .check(
                Schema.isGreaterThan(0).annotate({
                  expected: "a value greater than 0",
                }),
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
      reminderMinutesBefore: Schema.Union([
        Schema.Literals([0, 5, 15, 30]),
        Schema.Null,
      ]),
    }),
  ),
}).annotate({ identifier: "MyReservationsResponseDto" });

export type UpdateReservationDto = {
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly comment?: string | null;
  readonly reminderMinutesBefore?: 0 | 5 | 15 | 30 | null;
};

export const UpdateReservationDto = Schema.Struct({
  startsAt: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
  endsAt: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
  comment: Schema.optionalKey(
    Schema.Union([
      Schema.String.check(
        Schema.isMaxLength(128).annotate({
          expected: "a value with a length of at most 128",
        }),
      ),
      Schema.Null,
    ]),
  ),
  reminderMinutesBefore: Schema.optionalKey(
    Schema.Union([Schema.Literals([0, 5, 15, 30]), Schema.Null]),
  ),
})
  .check(
    Schema.makeFilter((data) => Object.keys(data).length > 0, {
      message: "At least one editable field is required",
    }),
  )
  .annotate({ identifier: "UpdateReservationDto" });

export type ListReservationSpotsPathParams = { readonly guildId: string };

export const ListReservationSpotsPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ListReservationSpots200 = ReservationSpotsResponseDto;

export const ListReservationSpots200 = ReservationSpotsResponseDto;

export type ListSpotReservationsPathParams = {
  readonly spotId: string;
  readonly guildId: string;
};

export const ListSpotReservationsPathParams = Schema.Struct({
  spotId: Schema.String,
  guildId: Schema.String,
});

export type ListSpotReservationsQuery = {
  readonly from: string;
  readonly to: string;
};

export const ListSpotReservationsQuery = Schema.Struct({
  from: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
    }),
  ),
  to: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
    }),
  ),
});

export type ListSpotReservations200 = ReservationWindowResponseDto;

export const ListSpotReservations200 = ReservationWindowResponseDto;

export type CreateReservationPathParams = {
  readonly spotId: string;
  readonly guildId: string;
};

export const CreateReservationPathParams = Schema.Struct({
  spotId: Schema.String,
  guildId: Schema.String,
});

export type CreateReservationRequestJson = CreateReservationDto;

export const CreateReservationRequestJson = CreateReservationDto;

export type CreateReservation201 = ReservationResponseDto;

export const CreateReservation201 = ReservationResponseDto;

export type DeleteReservationPathParams = {
  readonly reservationId: number;
  readonly guildId: string;
};

export const DeleteReservationPathParams = Schema.Struct({
  reservationId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  guildId: Schema.String,
});

export type PinReservationSpotPathParams = {
  readonly spotId: string;
  readonly guildId: string;
};

export const PinReservationSpotPathParams = Schema.Struct({
  spotId: Schema.String,
  guildId: Schema.String,
});

export type UnpinReservationSpotPathParams = {
  readonly spotId: string;
  readonly guildId: string;
};

export const UnpinReservationSpotPathParams = Schema.Struct({
  spotId: Schema.String,
  guildId: Schema.String,
});

export type ListMyReservationsQuery = { readonly status?: "upcoming" | "past" };

export const ListMyReservationsQuery = Schema.Struct({
  status: Schema.optionalKey(
    Schema.Literals(["upcoming", "past"]).annotate({ default: "upcoming" }),
  ),
});

export type ListMyReservations200 = MyReservationsResponseDto;

export const ListMyReservations200 = MyReservationsResponseDto;

export type DeleteMyReservationPathParams = { readonly reservationId: number };

export const DeleteMyReservationPathParams = Schema.Struct({
  reservationId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
});

export type UpdateMyReservationPathParams = { readonly reservationId: number };

export const UpdateMyReservationPathParams = Schema.Struct({
  reservationId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
});

export type UpdateMyReservationRequestJson = UpdateReservationDto;

export const UpdateMyReservationRequestJson = UpdateReservationDto;

export type UpdateMyReservation200 = ReservationResponseDto;

export const UpdateMyReservation200 = ReservationResponseDto;
