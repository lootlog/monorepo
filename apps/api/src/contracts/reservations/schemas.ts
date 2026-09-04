/** Shared input and output schemas for the reservations feature. */
import * as Schema from "effect/Schema";
import {
  DateTimeWithOffsetString,
  DateTimeString,
  FiniteNumber,
  SafeInteger,
  JsonValue,
  NonNegativeSafeInteger,
} from "#src/contracts/scalars";

const ReservationAuthor = Schema.Struct({
  displayName: Schema.String,
  avatarUrl: Schema.Union([Schema.String, Schema.Null]),
});
const ReservationSourceOrganization = Schema.Struct({
  name: Schema.String,
  iconUrl: Schema.Union([Schema.String, Schema.Null]),
  isCurrent: Schema.Boolean,
  calendarPath: Schema.String.check(
    Schema.isPattern(new RegExp("^\\/.*")).annotate({
      expected: "a string matching the RegExp ^\\/.*",
    }),
  ),
});
const ReservationLimit = Schema.Number.check(
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
  );

const ReservationEditingLimits = Schema.Struct({
  reservationMaxDurationMinutes: ReservationLimit,
  reservationMinDurationMinutes: ReservationLimit,
  reservationTimeGranularityMinutes: ReservationLimit,
  reservationMaxAdvanceDays: ReservationLimit,
});
const reservationFields = {
  id: SafeInteger,
  spotId: Schema.String,
  spotName: Schema.String,
  startsAt: DateTimeString,
  endsAt: DateTimeString,
  comment: Schema.Union([Schema.String, Schema.Null]),
  createdAt: DateTimeString,
  author: ReservationAuthor,
  sourceOrganization: ReservationSourceOrganization,
  isMine: Schema.Boolean,
  canEdit: Schema.Boolean,
  canCancel: Schema.Boolean,
  editingConstraints: Schema.Union([
    Schema.StructWithRest(ReservationEditingLimits, [
      Schema.Record(Schema.String, JsonValue),
    ]),
    Schema.Null,
  ]),
  reminderMinutesBefore: Schema.Union([
    Schema.Literals([0, 5, 15, 30]),
    Schema.Null,
  ]),
};

export const ReservationSpotsResponse = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    level: SafeInteger,
    images: Schema.Array(Schema.String),
    maps: Schema.Array(Schema.String),
    isPinned: Schema.Boolean,
    isAvailableNow: Schema.Boolean,
    availableUntil: Schema.Union([DateTimeString, Schema.Null]),
    activeReservationCount: NonNegativeSafeInteger,
    hasPartnerReservations: Schema.Boolean,
    currentReservation: Schema.Union([
      Schema.StructWithRest(Schema.Struct(reservationFields), [
        Schema.Record(Schema.String, JsonValue),
      ]),
      Schema.Null,
    ]),
    nextReservation: Schema.Union([
      Schema.StructWithRest(Schema.Struct(reservationFields), [
        Schema.Record(Schema.String, JsonValue),
      ]),
      Schema.Null,
    ]),
  }),
).annotate({ identifier: "ReservationSpotsResponseDto" });
export type ReservationSpotsResponse = typeof ReservationSpotsResponse.Type;

export const ReservationWindowResponse = Schema.Struct({
  items: Schema.Array(Schema.Struct(reservationFields)),
  window: Schema.Struct({
    from: DateTimeString,
    to: DateTimeString,
  }),
}).annotate({ identifier: "ReservationWindowResponseDto" });
export type ReservationWindowResponse = typeof ReservationWindowResponse.Type;

export const CreateReservationRequest = Schema.Struct({
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
export type CreateReservationRequest = typeof CreateReservationRequest.Type;

export const ReservationResponse = Schema.Struct(reservationFields).annotate({
  identifier: "ReservationResponseDto",
});
export type ReservationResponse = typeof ReservationResponse.Type;

export const MyReservationsResponse = Schema.Struct({
  items: Schema.Array(Schema.Struct(reservationFields)),
}).annotate({ identifier: "MyReservationsResponseDto" });
export type MyReservationsResponse = typeof MyReservationsResponse.Type;

export const UpdateReservationRequest = Schema.Struct({
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
export type UpdateReservationRequest = typeof UpdateReservationRequest.Type;

export const OrganizationReservationParams = Schema.Struct({
  guildId: Schema.String,
});
export type OrganizationReservationParams =
  typeof OrganizationReservationParams.Type;

export const ReservationSpotParams = Schema.Struct({
  spotId: Schema.String,
  guildId: Schema.String,
});
export type ReservationSpotParams = typeof ReservationSpotParams.Type;

export const ReservationWindowQuery = Schema.Struct({
  from: DateTimeWithOffsetString,
  to: DateTimeWithOffsetString,
});
export type ReservationWindowQuery = typeof ReservationWindowQuery.Type;

export const OrganizationReservationParamsWithId = Schema.Struct({
  reservationId: FiniteNumber,
  guildId: Schema.String,
});
export type OrganizationReservationParamsWithId =
  typeof OrganizationReservationParamsWithId.Type;

export const MyReservationsQuery = Schema.Struct({
  status: Schema.optionalKey(
    Schema.Literals(["upcoming", "past"]).annotate({ default: "upcoming" }),
  ),
});
export type MyReservationsQuery = typeof MyReservationsQuery.Type;

export const ReservationParams = Schema.Struct({
  reservationId: FiniteNumber,
});
export type ReservationParams = typeof ReservationParams.Type;
