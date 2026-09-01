import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const ReservationRecordSchema = z.object({
  id: z.number(),
  reservationId: z.string(),
  createdDate: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  createdBy: z.string(),
});

export class ReservationRecordDto extends createZodDto(
  ReservationRecordSchema,
) {}

const ReservationCreateEventSchema = z.object({
  guildId: z.string(),
  reservation: ReservationRecordSchema,
});

export class ReservationCreateEventDto extends createZodDto(
  ReservationCreateEventSchema,
) {}

const ReservationDeleteEventSchema = z.object({
  guildId: z.string(),
  reservation: ReservationRecordSchema,
});

export class ReservationDeleteEventDto extends createZodDto(
  ReservationDeleteEventSchema,
) {}

export const ReservationChangedEventV2Schema = z.object({
  version: z.literal(2),
  action: z.enum(["created", "updated", "deleted", "sharing-changed"]),
  sourceGuildId: z.string(),
  audienceGuildIds: z.array(z.string()).min(1),
  reservationId: z.number().int().nullable(),
  spotId: z.string().nullable(),
});

export class ReservationChangedEventV2Dto extends createZodDto(
  ReservationChangedEventV2Schema,
) {}

export const CompiledReservationChangedEventV2Schema = z.compile(
  ReservationChangedEventV2Schema,
  { strict: true },
);
