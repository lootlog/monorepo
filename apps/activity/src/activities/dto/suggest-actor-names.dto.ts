import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const SuggestActorNamesSchema = z.object({
  search: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export class SuggestActorNamesDto extends createZodDto(
  SuggestActorNamesSchema,
) {}
