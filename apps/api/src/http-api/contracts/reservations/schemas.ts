/** Transport schemas owned by the reservations HTTP module. */
import * as Schema from "effect/Schema";
import {
  DateTimeWithOffsetString,
  DateTimeString,
  FiniteNumber,
} from "../scalars.js";

export type ReservationSpotsResponseDto =
  typeof ReservationSpotsResponseDto.Type;

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
    availableUntil: Schema.Union([DateTimeString, Schema.Null]),
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
          startsAt: DateTimeString,
          endsAt: DateTimeString,
          comment: Schema.Union([Schema.String, Schema.Null]),
          createdAt: DateTimeString,
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
          startsAt: DateTimeString,
          endsAt: DateTimeString,
          comment: Schema.Union([Schema.String, Schema.Null]),
          createdAt: DateTimeString,
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

export type ReservationWindowResponseDto =
  typeof ReservationWindowResponseDto.Type;

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
      startsAt: DateTimeString,
      endsAt: DateTimeString,
      comment: Schema.Union([Schema.String, Schema.Null]),
      createdAt: DateTimeString,
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
    from: DateTimeString,
    to: DateTimeString,
  }),
}).annotate({ identifier: "ReservationWindowResponseDto" });

export type CreateReservationDto = typeof CreateReservationDto.Type;

export const CreateReservationDto = Schema.Struct({
  startsAt: DateTimeWithOffsetString,
  endsAt: DateTimeWithOffsetString,
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

export type ReservationResponseDto = typeof ReservationResponseDto.Type;

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
  startsAt: DateTimeString,
  endsAt: DateTimeString,
  comment: Schema.Union([Schema.String, Schema.Null]),
  createdAt: DateTimeString,
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

export type MyReservationsResponseDto = typeof MyReservationsResponseDto.Type;

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
      startsAt: DateTimeString,
      endsAt: DateTimeString,
      comment: Schema.Union([Schema.String, Schema.Null]),
      createdAt: DateTimeString,
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

export type UpdateReservationDto = typeof UpdateReservationDto.Type;

export const UpdateReservationDto = Schema.Struct({
  startsAt: Schema.optionalKey(DateTimeWithOffsetString),
  endsAt: Schema.optionalKey(DateTimeWithOffsetString),
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

export type ListReservationSpotsPathParams =
  typeof ListReservationSpotsPathParams.Type;

export const ListReservationSpotsPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ListReservationSpots200 = typeof ListReservationSpots200.Type;

export const ListReservationSpots200 = ReservationSpotsResponseDto;

export type ListSpotReservationsPathParams =
  typeof ListSpotReservationsPathParams.Type;

export const ListSpotReservationsPathParams = Schema.Struct({
  spotId: Schema.String,
  guildId: Schema.String,
});

export type ListSpotReservationsQuery = typeof ListSpotReservationsQuery.Type;

export const ListSpotReservationsQuery = Schema.Struct({
  from: DateTimeWithOffsetString,
  to: DateTimeWithOffsetString,
});

export type ListSpotReservations200 = typeof ListSpotReservations200.Type;

export const ListSpotReservations200 = ReservationWindowResponseDto;

export type CreateReservationPathParams =
  typeof CreateReservationPathParams.Type;

export const CreateReservationPathParams = Schema.Struct({
  spotId: Schema.String,
  guildId: Schema.String,
});

export type CreateReservationRequestJson =
  typeof CreateReservationRequestJson.Type;

export const CreateReservationRequestJson = CreateReservationDto;

export type CreateReservation201 = typeof CreateReservation201.Type;

export const CreateReservation201 = ReservationResponseDto;

export type DeleteReservationPathParams =
  typeof DeleteReservationPathParams.Type;

export const DeleteReservationPathParams = Schema.Struct({
  reservationId: FiniteNumber,
  guildId: Schema.String,
});

export type PinReservationSpotPathParams =
  typeof PinReservationSpotPathParams.Type;

export const PinReservationSpotPathParams = Schema.Struct({
  spotId: Schema.String,
  guildId: Schema.String,
});

export type UnpinReservationSpotPathParams =
  typeof UnpinReservationSpotPathParams.Type;

export const UnpinReservationSpotPathParams = Schema.Struct({
  spotId: Schema.String,
  guildId: Schema.String,
});

export type ListMyReservationsQuery = typeof ListMyReservationsQuery.Type;

export const ListMyReservationsQuery = Schema.Struct({
  status: Schema.optionalKey(
    Schema.Literals(["upcoming", "past"]).annotate({ default: "upcoming" }),
  ),
});

export type ListMyReservations200 = typeof ListMyReservations200.Type;

export const ListMyReservations200 = MyReservationsResponseDto;

export type DeleteMyReservationPathParams =
  typeof DeleteMyReservationPathParams.Type;

export const DeleteMyReservationPathParams = Schema.Struct({
  reservationId: FiniteNumber,
});

export type UpdateMyReservationPathParams =
  typeof UpdateMyReservationPathParams.Type;

export const UpdateMyReservationPathParams = Schema.Struct({
  reservationId: FiniteNumber,
});

export type UpdateMyReservationRequestJson =
  typeof UpdateMyReservationRequestJson.Type;

export const UpdateMyReservationRequestJson = UpdateReservationDto;

export type UpdateMyReservation200 = typeof UpdateMyReservation200.Type;

export const UpdateMyReservation200 = ReservationResponseDto;
