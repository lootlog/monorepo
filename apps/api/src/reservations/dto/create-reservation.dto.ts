import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const CreateReservationSchema = z.object({
  reservationId: z.string().min(1),
  createdDate: z.coerce.date(),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
  createdBy: z.string().min(1),
  comment: z.string().max(128).optional(),
});

export class CreateReservationDto extends createZodDto(
  CreateReservationSchema,
) {}
