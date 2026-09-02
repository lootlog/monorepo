import * as z from "zod";
import { createZodDto } from "nestjs-zod";
import { KillStatsPeriodSchema } from "../utils/kill-stats-period.js";

const GetNpcKillersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  world: z.string().optional(),
  period: KillStatsPeriodSchema.optional(),
});

export class GetNpcKillersDto extends createZodDto(GetNpcKillersSchema) {}
