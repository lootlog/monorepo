import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const GetNpcKillersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  world: z.string().optional(),
});

export class GetNpcKillersDto extends createZodDto(GetNpcKillersSchema) {}
