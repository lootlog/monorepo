import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";
import { reservationReminderMinutesSchema } from "./create-reservation.dto.js";

const UpdateReservationSchema = z
  .object({
    startsAt: z.string().datetime({ offset: true }).optional(),
    endsAt: z.string().datetime({ offset: true }).optional(),
    comment: z.string().trim().max(128).nullable().optional(),
    reminderMinutesBefore: reservationReminderMinutesSchema
      .nullable()
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one editable field is required",
  });

export class UpdateReservationDto extends createSchemaClass(
  UpdateReservationSchema,
) {}
