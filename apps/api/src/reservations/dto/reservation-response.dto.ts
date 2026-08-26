import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { isoDatetimeCodec } from "src/shared/dto/zod-response-codecs";
import { reservationReminderMinutesSchema } from "./create-reservation.dto";

const ReservationAuthorSchema = z.object({
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
});

const ReservationSourceOrganizationSchema = z.object({
  name: z.string(),
  iconUrl: z.string().nullable(),
  isCurrent: z.boolean(),
  calendarPath: z.string().startsWith("/"),
});

const ReservationEditingConstraintsSchema = z.object({
  reservationMaxDurationMinutes: z.number().int().positive(),
  reservationMinDurationMinutes: z.number().int().positive(),
  reservationTimeGranularityMinutes: z.number().int().positive(),
  reservationMaxAdvanceDays: z.number().int().positive(),
});

export const ReservationResponseSchema = z.object({
  id: z.number().int(),
  spotId: z.string(),
  spotName: z.string(),
  startsAt: isoDatetimeCodec,
  endsAt: isoDatetimeCodec,
  comment: z.string().nullable(),
  createdAt: isoDatetimeCodec,
  author: ReservationAuthorSchema,
  sourceOrganization: ReservationSourceOrganizationSchema,
  isMine: z.boolean(),
  canEdit: z.boolean(),
  canCancel: z.boolean(),
  editingConstraints: ReservationEditingConstraintsSchema,
  reminderMinutesBefore: reservationReminderMinutesSchema.nullable(),
});

export class ReservationResponseDto extends createZodDto(
  ReservationResponseSchema,
  { codec: true },
) {}

const ReservationWindowResponseSchema = z.object({
  items: z.array(ReservationResponseSchema),
  window: z.object({
    from: isoDatetimeCodec,
    to: isoDatetimeCodec,
  }),
});

export class ReservationWindowResponseDto extends createZodDto(
  ReservationWindowResponseSchema,
  { codec: true },
) {}

const ReservationSpotResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().int(),
  images: z.array(z.string()),
  maps: z.array(z.string()),
  isPinned: z.boolean(),
  isAvailableNow: z.boolean(),
  availableUntil: isoDatetimeCodec.nullable(),
  activeReservationCount: z.number().int().nonnegative(),
  hasPartnerReservations: z.boolean(),
  currentReservation: ReservationResponseSchema.nullable(),
  nextReservation: ReservationResponseSchema.nullable(),
});

export class ReservationSpotResponseDto extends createZodDto(
  ReservationSpotResponseSchema,
  { codec: true },
) {}

export class ReservationSpotsResponseDto extends createZodDto(
  z.array(ReservationSpotResponseSchema),
  { codec: true },
) {}

const MyReservationsResponseSchema = z.object({
  items: z.array(ReservationResponseSchema),
});

export class MyReservationsResponseDto extends createZodDto(
  MyReservationsResponseSchema,
  { codec: true },
) {}
