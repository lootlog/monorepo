import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

export class ReservationWindowQueryDto extends createSchemaClass(
  z.object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
  }),
) {}

export class MyReservationsQueryDto extends createSchemaClass(
  z.object({
    status: z.enum(["upcoming", "past"]).default("upcoming"),
  }),
) {}
