import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const ResolveLootItemParamsSchema = z.object({
  hid: z.string().min(1),
  world: z.string().optional(),
});

export class ResolveLootItemParamsDto extends createZodDto(
  ResolveLootItemParamsSchema,
) {}
