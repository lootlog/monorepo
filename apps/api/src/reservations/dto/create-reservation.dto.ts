import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const reservationReminderMinutesSchema = z.union([
  z.literal(0),
  z.literal(5),
  z.literal(15),
  z.literal(30),
]);

const CreateReservationSchema = z
  .object({
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    comment: z.string().trim().max(128).optional(),
    reminderMinutesBefore: reservationReminderMinutesSchema.nullish(),
  })
  .strict();

export class CreateReservationDto extends createZodDto(
  CreateReservationSchema,
) {}
