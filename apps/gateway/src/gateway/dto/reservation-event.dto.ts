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
