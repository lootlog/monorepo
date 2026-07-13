import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const EventModeQuerySchema = z.object({
  world: z.string().trim().min(1),
});

export class EventModeQueryDto extends createZodDto(EventModeQuerySchema) {}
