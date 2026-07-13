import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const AirTagSubscriptionSchema = z
  .object({
    requestId: z.string().uuid(),
    enabled: z.boolean(),
    expectedMapId: z.number().int().min(0).max(65_535).optional(),
  })
  .refine(
    (payload) => !payload.enabled || payload.expectedMapId !== undefined,
    {
      message: "expectedMapId is required when AirTags are enabled",
      path: ["expectedMapId"],
    },
  );

export class AirTagSubscriptionDto extends createZodDto(
  AirTagSubscriptionSchema,
) {}
