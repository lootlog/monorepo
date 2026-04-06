import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const CreateReservationSchema = z.object({
  reservationId: z.string().min(1),
  createdDate: z.string().datetime(),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
  createdBy: z.string().min(1),
  comment: z.string().max(128).optional(),
});

export class CreateReservationDto extends createZodDto(
  CreateReservationSchema,
) {}
