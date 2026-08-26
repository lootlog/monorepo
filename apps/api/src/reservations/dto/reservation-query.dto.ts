import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class ReservationWindowQueryDto extends createZodDto(
  z.object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
  }),
) {}

export class MyReservationsQueryDto extends createZodDto(
  z.object({
    status: z.enum(["upcoming", "past"]).default("upcoming"),
  }),
) {}
